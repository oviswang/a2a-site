#!/usr/bin/env bash
set -euo pipefail

# P7-2 Stability Gates MVP
# - deterministic, evidence-based, no dashboards/CI
# - reads a traceDir (single run) or a benchmark run dir containing multiple traceDirs
# - outputs structured JSON with pass/fail + reasons + evidence paths

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  scripts/p7_2_gate_mvp.sh --dir <traceDir|benchRunDir> [--json-out <path>]

Input forms:
  - traceDir: a directory containing runner traces (*.json)
  - benchRunDir: a directory created by scripts/p7_1_benchmark_mvp.sh (contains index.txt and subdirs)

Output:
  - prints JSON to stdout (and optionally writes --json-out)

USAGE
}

DIR=""
JSON_OUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      DIR=${2:-}
      shift 2
      ;;
    --json-out)
      JSON_OUT=${2:-}
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$DIR" ]]; then
  echo "Missing --dir" >&2
  usage >&2
  exit 2
fi

if [[ ! -d "$DIR" ]]; then
  echo "Not a directory: $DIR" >&2
  exit 2
fi

# Tunables (MVP thresholds)
GATE_MAX_STUCK_WINDOWS=${GATE_MAX_STUCK_WINDOWS:-0}        # fail if stuck windows > 0
GATE_MAX_DEGRADED_WINDOWS=${GATE_MAX_DEGRADED_WINDOWS:-0}  # fail if degraded windows > 0 (strict MVP)
GATE_MAX_HUMAN_REQUIRED=${GATE_MAX_HUMAN_REQUIRED:-0}      # fail if HUMAN_ACTION_REQUIRED > 0
GATE_MAX_ACT_FAIL=${GATE_MAX_ACT_FAIL:-0}                  # fail if act_fail > 0

# coordination stability (MVP)
GATE_MAX_OWNER_STALE=${GATE_MAX_OWNER_STALE:-0}            # fail if owner_stale > 0
GATE_MAX_TAKEOVER=${GATE_MAX_TAKEOVER:-0}                  # fail if takeover > 0
GATE_MAX_YIELD_TO_PEER=${GATE_MAX_YIELD_TO_PEER:-999999}    # default allow

# multi-parent cost sanity (MVP)
GATE_MAX_ATTENTION_REQ=${GATE_MAX_ATTENTION_REQ:-999999}
GATE_MIN_FRESH_CACHE_SKIP=${GATE_MIN_FRESH_CACHE_SKIP:-0}

DIR="$DIR" \
GATE_MAX_STUCK_WINDOWS="$GATE_MAX_STUCK_WINDOWS" \
GATE_MAX_DEGRADED_WINDOWS="$GATE_MAX_DEGRADED_WINDOWS" \
GATE_MAX_HUMAN_REQUIRED="$GATE_MAX_HUMAN_REQUIRED" \
GATE_MAX_ACT_FAIL="$GATE_MAX_ACT_FAIL" \
GATE_MAX_OWNER_STALE="$GATE_MAX_OWNER_STALE" \
GATE_MAX_TAKEOVER="$GATE_MAX_TAKEOVER" \
GATE_MAX_YIELD_TO_PEER="$GATE_MAX_YIELD_TO_PEER" \
GATE_MAX_ATTENTION_REQ="$GATE_MAX_ATTENTION_REQ" \
GATE_MIN_FRESH_CACHE_SKIP="$GATE_MIN_FRESH_CACHE_SKIP" \
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const DIR = process.env.DIR;

function listDirs(p) {
  return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(p, d.name));
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function globJson(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

function pickEvidence(files, pred) {
  const hits = files.filter(pred);
  hits.sort();
  return hits[hits.length - 1] || null;
}

function collectTraceDirs(inputDir) {
  const indexPath = path.join(inputDir, 'index.txt');
  if (fs.existsSync(indexPath)) {
    // benchRunDir: use index.txt
    const lines = fs.readFileSync(indexPath, 'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const out = [];
    for (const ln of lines) {
      const parts = ln.split(/\s+/);
      const traceDir = parts[1];
      if (traceDir && fs.existsSync(traceDir) && fs.statSync(traceDir).isDirectory()) out.push({ name: parts[0] || path.basename(traceDir), dir: traceDir });
    }
    return out.length ? out : [{ name: path.basename(inputDir), dir: inputDir }];
  }
  // traceDir
  return [{ name: path.basename(inputDir), dir: inputDir }];
}

function parseSummaryCost(summary) {
  const cost = summary && summary.cost ? summary.cost : null;
  const byStage = cost?.requests?.byStage || {};
  const byParent = cost?.requests?.byParent || {};
  return {
    loops: Number(cost?.loops || 0),
    requestsTotal: Number(cost?.requests?.total || 0),
    byStage,
    byParent,
    refreshWillFetch: Number(cost?.refreshPlan?.willFetch || 0),
    refreshSkippedFreshCache: Number(cost?.refreshPlan?.skippedByFreshCache || 0),
  };
}

function gateOne(traceDir, name) {
  const files = globJson(traceDir);

  // Prefer latest summary if present, else build minimal summary from decision+act+echo traces.
  const latestSummaryPath = pickEvidence(files, p => p.endsWith('.summary.json') || p.endsWith('latest.summary.json'));
  const summary = latestSummaryPath ? readJson(latestSummaryPath) : null;

  const decisionPaths = files.filter(p => p.endsWith('.decision.json'));
  const actPaths = files.filter(p => p.endsWith('.act.json'));
  const echoPaths = files.filter(p => p.endsWith('.echo.json'));

  const keyMetrics = {
    health: summary?.health || null,
    windowLoops: Number(summary?.windowLoops || 0),
    counts: summary?.counts || {},
    conflictCounts: {},
    cost: summary ? parseSummaryCost(summary) : null,
    derived: {
      actFail: 0,
      humanRequired: 0,
      stuckWindows: 0,
      degradedWindows: 0,
      ownerStale: 0,
      takeover: 0,
      yieldToPeer: 0,
      attentionReq: 0,
      topParentFetch: null,
      topStage: null,
    },
  };

  // conflict codes from decisions
  const cc = {};
  for (const p of decisionPaths) {
    const j = readJson(p);
    const rc = j && j.reasonCode ? String(j.reasonCode) : null;
    if (rc) cc[rc] = (cc[rc] || 0) + 1;
  }
  keyMetrics.conflictCounts = cc;

  // derive minimal metrics
  const counts = keyMetrics.counts || {};
  keyMetrics.derived.actFail = Number(counts.act_fail || 0);
  keyMetrics.derived.humanRequired = Number(counts.HUMAN_ACTION_REQUIRED || 0);

  // windows health
  if (summary?.health === 'stuck') keyMetrics.derived.stuckWindows = 1;
  if (summary?.health === 'degraded') keyMetrics.derived.degradedWindows = 1;

  keyMetrics.derived.ownerStale = Number(cc.owner_stale || 0);
  keyMetrics.derived.takeover = Number(cc.takeover || 0);
  keyMetrics.derived.yieldToPeer = Number(cc.yield_to_peer || 0);

  const cost = keyMetrics.cost;
  if (cost) {
    keyMetrics.derived.attentionReq = Number(cost.byStage?.attention || 0);

    // top parent
    let topPid = null, topN = -1;
    for (const [pid, n] of Object.entries(cost.byParent || {})) {
      const v = Number(n || 0);
      if (v > topN) { topN = v; topPid = pid; }
    }
    keyMetrics.derived.topParentFetch = topPid ? { parentTaskId: topPid, attentionFetch: topN } : null;

    // top stage
    let topStage = null, topStageN = -1;
    for (const [st, n] of Object.entries(cost.byStage || {})) {
      const v = Number(n || 0);
      if (v > topStageN) { topStageN = v; topStage = st; }
    }
    keyMetrics.derived.topStage = topStage ? { stage: topStage, requests: topStageN } : null;
  }

  const reasons = [];
  const evidence = [];

  function fail(code, detail, paths=[]) {
    reasons.push({ level: 'fail', code, detail });
    for (const p of paths) evidence.push(p);
  }
  function warn(code, detail, paths=[]) {
    reasons.push({ level: 'warn', code, detail });
    for (const p of paths) evidence.push(p);
  }

  // Gate 1: stuck
  const maxStuck = Number(process.env.GATE_MAX_STUCK_WINDOWS || 0);
  if (keyMetrics.derived.stuckWindows > maxStuck) {
    fail('stuck', { health: summary?.health || null, maxStuckWindows: maxStuck }, [latestSummaryPath].filter(Boolean));
  }

  // Gate 2: act_fail
  const maxActFail = Number(process.env.GATE_MAX_ACT_FAIL || 0);
  if (keyMetrics.derived.actFail > maxActFail) {
    fail('act_fail', { act_fail: keyMetrics.derived.actFail, maxActFail }, [latestSummaryPath].filter(Boolean));
  }

  // Gate 3: HUMAN_ACTION_REQUIRED
  const maxHuman = Number(process.env.GATE_MAX_HUMAN_REQUIRED || 0);
  if (keyMetrics.derived.humanRequired > maxHuman) {
    fail('human_action_required', { HUMAN_ACTION_REQUIRED: keyMetrics.derived.humanRequired, maxHuman }, [latestSummaryPath].filter(Boolean));
  }

  // Gate 4: same-role coordination stability
  const maxOwnerStale = Number(process.env.GATE_MAX_OWNER_STALE || 0);
  const maxTakeover = Number(process.env.GATE_MAX_TAKEOVER || 0);
  const maxYield = Number(process.env.GATE_MAX_YIELD_TO_PEER || 999999);

  if (keyMetrics.derived.ownerStale > maxOwnerStale) {
    fail('same_role_owner_stale', { owner_stale: keyMetrics.derived.ownerStale, maxOwnerStale }, decisionPaths.slice(-3));
  }
  if (keyMetrics.derived.takeover > maxTakeover) {
    fail('same_role_takeover', { takeover: keyMetrics.derived.takeover, maxTakeover }, decisionPaths.slice(-3));
  }
  if (keyMetrics.derived.yieldToPeer > maxYield) {
    warn('same_role_yield_to_peer', { yield_to_peer: keyMetrics.derived.yieldToPeer, maxYield }, decisionPaths.slice(-3));
  }

  // Gate 5: multi-parent cost sanity
  const maxAtt = Number(process.env.GATE_MAX_ATTENTION_REQ || 999999);
  const minFreshSkip = Number(process.env.GATE_MIN_FRESH_CACHE_SKIP || 0);

  if (cost) {
    if (keyMetrics.derived.attentionReq > maxAtt) {
      fail('attention_cost_high', { attention_requests: keyMetrics.derived.attentionReq, maxAtt }, [latestSummaryPath].filter(Boolean));
    }
    if (minFreshSkip > 0 && Number(cost.refreshSkippedFreshCache || 0) < minFreshSkip) {
      warn('refresh_skip_low', { skippedByFreshCache: cost.refreshSkippedFreshCache, minFreshSkip }, [latestSummaryPath].filter(Boolean));
    }
  } else {
    warn('no_summary_cost', { note: 'summary.cost missing; run with summary enabled to gate cost' }, []);
  }

  // Basic evidence: include latest summary + latest decision/act/echo
  const latestDecision = pickEvidence(files, p => p.endsWith('.decision.json'));
  const latestAct = pickEvidence(files, p => p.endsWith('.act.json'));
  const latestEcho = pickEvidence(files, p => p.endsWith('.echo.json'));
  for (const p of [latestSummaryPath, latestDecision, latestAct, latestEcho].filter(Boolean)) evidence.push(p);

  const failed = reasons.some(r => r.level === 'fail');
  return {
    name,
    traceDir,
    SAFE_FOR_LONG_RUN: failed ? 'no' : 'yes',
    pass: !failed,
    gateReasons: reasons,
    evidencePaths: Array.from(new Set(evidence)),
    keyMetrics,
  };
}

const input = DIR;
const targets = collectTraceDirs(input);
const results = targets.map(t => gateOne(t.dir, t.name));

const overallPass = results.every(r => r.pass);

const out = {
  ok: true,
  kind: 'p7_2_gate',
  inputDir: input,
  SAFE_FOR_LONG_RUN: overallPass ? 'yes' : 'no',
  pass: overallPass,
  results,
};

process.stdout.write(JSON.stringify(out, null, 2));
NODE