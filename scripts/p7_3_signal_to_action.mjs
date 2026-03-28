#!/usr/bin/env node

// P7-3: deterministic signal -> action mapping (MVP)
// - No AI diagnosis.
// - Input: gate JSON (preferred) or summary/decision rollups.
// - Output: {recommendedActions[], rescuePriority, stopConditions[]}

import fs from 'node:fs';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function action(id, title, steps, evidence = [], whenToStop = [], validationChecks = [], validationWorkflow = []) {
  return {
    id,
    title,
    steps: steps || [],
    validationChecks: validationChecks || [],
    validationWorkflow: validationWorkflow || [],
    evidencePaths: uniq(evidence),
    whenToStop: whenToStop || [],
  };
}

function workflow({
  name,
  reRunCommand,
  targetMetrics,
  compareRule,
  expectedOutcome,
  passCondition,
  note,
}) {
  return {
    name,
    reRunCommand,
    targetMetrics: targetMetrics || [],
    compareRule,
    expectedOutcome,
    passCondition,
    note: note || null,
  };
}

function vcheck({
  checkType,
  targetField,
  expectedChange,
  evidencePathHint,
  compareWindow,
  note,
}) {
  return {
    checkType,
    targetField,
    expectedChange,
    evidencePathHint,
    compareWindow,
    note: note || null,
  };
}

function mapReasonsToActions({ gate, summary, decision, traceDir }) {
  const reasons = [];
  const gateRecommended = [];
  if (gate?.results?.length) {
    for (const r of gate.results) {
      for (const gr of (r.gateReasons || [])) {
        reasons.push({ level: gr.level, code: gr.code, detail: gr.detail || null });
      }
      for (const ra of (r.recommendedActions || [])) {
        if (ra && ra.id) gateRecommended.push(ra);
      }
    }
  }

  const s = summary || null;
  const counts = s?.counts || {};
  const cost = s?.cost || null;

  const conflictCounts = (s?.perRole && typeof s.perRole === 'object') ? null : null; // placeholder; reasonCodes live in decision traces

  const out = {
    ok: true,
    kind: 'p7_3_signal_to_action',
    traceDir: traceDir || null,
    inputs: {
      hasGate: !!gate,
      hasSummary: !!summary,
      hasDecision: !!decision,
    },
    rescuePriority: {
      parent: null,
      role: null,
      rationale: [],
    },
    recommendedActions: [],
    stopConditions: [],
  };

  // Rescue priority heuristics (deterministic, MVP)
  // 1) prefer any stuck parent from summary.perParent
  if (s?.perParent && typeof s.perParent === 'object') {
    let stuckPid = null;
    for (const [pid, p] of Object.entries(s.perParent)) {
      if (p && p.health === 'stuck') {
        stuckPid = pid;
        break;
      }
    }
    if (stuckPid) {
      out.rescuePriority.parent = stuckPid;
      out.rescuePriority.rationale.push('perParent.health=stuck');
    }
  }
  // 2) prefer any role with mostly_handoff/all_wait hints
  if (s?.hints && Array.isArray(s.hints)) {
    for (const h of s.hints) {
      if (h?.governance === 'per_role' && Array.isArray(h.recommend) && h.recommend.length) {
        out.rescuePriority.role = h.recommend[0]?.role || null;
        if (out.rescuePriority.role) out.rescuePriority.rationale.push('summary.hints.governance=per_role');
        break;
      }
    }
  }

  const evidenceBase = gate?.results?.[0]?.evidencePaths || [];

  // Core mapping: gate reason codes + summary health/counts
  const reasonCodes = new Set(reasons.map(r => String(r.code || '')));

  // If gate has no actionable signals but summary-derived counts show issues, synthesize reasonCodes.
  if (Number(counts.act_fail || 0) > 0) reasonCodes.add('act_fail');
  if (Number(counts.HUMAN_ACTION_REQUIRED || 0) > 0) reasonCodes.add('human_action_required');
  if (s?.health === 'stuck') reasonCodes.add('stuck');

  if (reasonCodes.has('stuck') || s?.health === 'stuck') {
    out.recommendedActions.push(action(
      'stuck.triage',
      'Runner stuck: localize stage, then reduce duplicate side effects',
      [
        '1) Open latest summary (health=stuck) and confirm counts (noop/precondition_failed/stale_skip/dedupe_skip).',
        '2) Open latest decision.json to see policyDecision + reasonCode (look for precondition_failed/stale_skip/dedupe_skip).',
        '3) If multi-parent: use summary.perParent to rescue the stuck parent first; temporarily reduce parents set to the stuck parent only.',
        '4) Reduce duplicate instances for the same role (same-role coordination or accidental duplicates).',
      ],
      evidenceBase,
      [
        'If HUMAN_ACTION_REQUIRED appears, stop automation and follow runbook HUMAN boundary.',
      ]
    ));
  }

  if (reasonCodes.has('act_fail') || Number(counts.act_fail || 0) > 0) {
    out.recommendedActions.push(action(
      'act_fail.recover',
      'Action failed: inspect act trace, classify deterministic error, avoid repeating side effects',
      [
        '1) Open latest *.act.json and capture error/status/json.error.',
        '2) Verify actorHandle/token pairing and deliverable state (already submitted/accepted).',
        '3) If error is auth/token-related, treat as HUMAN_ACTION_REQUIRED and rotate token.',
        '4) Do not clear dedupe/state.json unless you fully understand side effects.',
      ],
      evidenceBase,
      [
        'If error indicates token invalid/permission denied: stop and resolve as HUMAN_ACTION_REQUIRED.',
      ],
      [
        vcheck({
          checkType: 'graded_gate',
          targetField: 'gateReasons(code=act_fail)',
          expectedChange: 'decrease_to_zero',
          evidencePathHint: 'scripts/p7_2_gate_mvp.sh output on the same traceDir',
          compareWindow: 'after fix; run >=1 summary window',
        }),
        vcheck({
          checkType: 'summary_counts',
          targetField: 'summary.counts.act_fail',
          expectedChange: 'decrease',
          evidencePathHint: 'latest *.summary.json',
          compareWindow: 'next summary window',
        }),
      ]
    ));
  }

  if (reasonCodes.has('human_action_required') || Number(counts.HUMAN_ACTION_REQUIRED || 0) > 0) {
    out.recommendedActions.push(action(
      'human_required.stop',
      'HUMAN_ACTION_REQUIRED: stop automation and resolve boundary condition',
      [
        '1) Stop long-running runner (do not keep looping).',
        '2) Open latest fatal/decision trace to read the reasonCode (e.g. blocked_stale, token invalid).',
        '3) Perform the required human action (token reissue/permission/blocked decision).',
        '4) Restart runner after resolution and re-run a short smoke loop.',
      ],
      evidenceBase,
      [],
      [
        vcheck({
          checkType: 'graded_gate',
          targetField: 'gateReasons(code=human_action_required)',
          expectedChange: 'decrease_to_zero',
          evidencePathHint: 'scripts/p7_2_gate_mvp.sh output after restart',
          compareWindow: 'next 1-2 summary windows',
        }),
        vcheck({
          checkType: 'summary_counts',
          targetField: 'summary.counts.HUMAN_ACTION_REQUIRED',
          expectedChange: 'be_zero',
          evidencePathHint: 'latest *.summary.json',
          compareWindow: 'next summary window',
        }),
      ]
    ));
    out.stopConditions.push('HUMAN_ACTION_REQUIRED');
  }

  if (reasonCodes.has('same_role_owner_stale') || reasonCodes.has('same_role_takeover')) {
    out.recommendedActions.push(action(
      'same_role.unstable',
      'Same-role coordination unstable: reduce concurrency, verify owner ring config, then re-run',
      [
        '1) Verify A2A_SAME_ROLE_HANDLES contains the full stable handle ring and each instance uses a distinct handle.',
        '2) Reduce same-role instance count to 1 temporarily to regain stability.',
        '3) Increase OWNER_STALE_MS to avoid premature takeover (only after verifying progress surface stability).',
        '4) Re-run a short benchmark with same-role on to confirm owner_stale/takeover drops to 0.',
      ],
      evidenceBase,
      [],
      [
        vcheck({
          checkType: 'graded_gate',
          targetField: 'gateReasons(code=same_role_owner_stale|same_role_takeover)',
          expectedChange: 'decrease_to_zero',
          evidencePathHint: 'scripts/p7_2_gate_mvp.sh output on same-role traceDir',
          compareWindow: 'same workload; same-role=on; after config change',
        }),
        vcheck({
          checkType: 'decision_reason_rate',
          targetField: 'decision.reasonCode (owner_stale/takeover/yield_to_peer)',
          expectedChange: 'owner_stale/takeover decrease; yield_to_peer stable_or_decrease',
          evidencePathHint: '*.decision.json (or summary.perRole conflictCounts when available)',
          compareWindow: '>=1 yield window (A2A_YIELD_WINDOW_MS) across several loops',
        }),
      ],
      [
        workflow({
          name: 're-run gate (same-role traces)',
          reRunCommand: 'scripts/p7_2_gate_mvp.sh --dir <sameRoleTraceDir>',
          targetMetrics: ['gateLevel', 'gateReasons(code=same_role_owner_stale|same_role_takeover|same_role_yield_to_peer)'],
          compareRule: 'same_role_* reasons should drop; gateLevel improves',
          expectedOutcome: 'coordination becomes stable enough for long_run_ok or observe_only',
          passCondition: 'no same_role_owner_stale/takeover fail reasons',
        }),
        workflow({
          name: 're-run short same-role smoke (windowed)',
          reRunCommand: 'scripts/p7_1_benchmark_mvp.sh (same-role=on, MAX_LOOPS>=5)',
          targetMetrics: ['decision.reasonCode rate', 'summary.counts.handoff/wait'],
          compareRule: 'owner_stale/takeover decrease; no persistent contention loops',
          expectedOutcome: 'takeover becomes rare and purposeful (stale only)',
          passCondition: 'owner_stale/takeover == 0 over several loops (unless truly stale owner)',
        }),
      ]
    ));
  }

  // Handoff/wait-heavy (from summary.counts)
  const loops = Number(s?.windowLoops || 0) || 0;
  const handoff = Number(counts.handoff || 0);
  const wait = Number(counts.wait || 0);
  if (loops >= 5 && handoff / loops > 0.8) {
    out.recommendedActions.push(action(
      'handoff.high',
      'Too much handoff: verify role boundary and parent selection',
      [
        '1) Check A2A_ROLE and confirm runner is allowed to act on the observed top.type.',
        '2) Confirm A2A_PARENT_TASK_ID(S) points to the correct parent coordination task(s).',
        '3) If multi-parent: inspect summary.perParent to identify where work exists but is always handed off; rescue that parent first.',
      ],
      evidenceBase,
      [],
      [
        vcheck({
          checkType: 'summary_ratio',
          targetField: 'summary.counts.handoff / summary.windowLoops',
          expectedChange: 'decrease_below_0.8',
          evidencePathHint: 'latest *.summary.json',
          compareWindow: '>=5 loops window',
        }),
        vcheck({
          checkType: 'graded_gate',
          targetField: 'gateLevel',
          expectedChange: 'improve',
          evidencePathHint: 'scripts/p7_2_gate_mvp.sh output',
          compareWindow: 'after fixing role/parent mismatch',
        }),
      ]
    ));
  }
  if (loops >= 5 && wait / loops > 0.8) {
    out.recommendedActions.push(action(
      'wait.high',
      'Mostly wait: verify attention is truly empty vs access/membership issues',
      [
        '1) Check latest attention traces: items_len should be 0 for healthy idle.',
        '2) If attention non-empty but runner waits, inspect decision policyDecision and reasonCode.',
        '3) Verify join/membership is ok (join traces not failing/requested).',
      ],
      evidenceBase,
      [],
      [
        vcheck({
          checkType: 'summary_ratio',
          targetField: 'summary.counts.wait / summary.windowLoops',
          expectedChange: 'decrease_below_0.8_or_confirm_idle',
          evidencePathHint: 'latest *.summary.json + attention traces',
          compareWindow: '>=5 loops window',
        }),
        vcheck({
          checkType: 'attention_items',
          targetField: 'attention.items_len',
          expectedChange: 'be_zero_for_healthy_idle',
          evidencePathHint: 'latest attention.*.json',
          compareWindow: 'next 1-2 loops',
        }),
      ]
    ));
  }

  // Cost/refresh anomalies
  const attReq = Number(cost?.requests?.byStage?.attention || 0);
  const skippedFresh = Number(cost?.refreshPlan?.skippedByFreshCache || 0);
  if (reasonCodes.has('attention_cost_high') || attReq > 0) {
    // only recommend if attention is a dominant stage
    const byStage = cost?.requests?.byStage || {};
    let topStage = null;
    let topN = -1;
    for (const [k, v] of Object.entries(byStage)) {
      const n = Number(v || 0);
      if (n > topN) { topN = n; topStage = k; }
    }
    if (topStage === 'attention') {
      out.recommendedActions.push(action(
        'cost.attention.reduce',
        'Attention cost high: tune refresh gating deterministically',
        [
          '1) Set A2A_PARENT_REFRESH_MS to a non-zero value to enable refresh gating.',
          '2) Keep A2A_PARENT_SMALL_ALL small (default 5) to avoid full-refresh when parent count grows.',
          '3) Keep A2A_PARENT_RR_K minimal (default 1) to prevent excessive supplemental fetch.',
          '4) Re-run p7-1 benchmark: expect skippedByFreshCache to increase and attention request count to drop.',
        ],
        evidenceBase,
        [],
        [
          vcheck({
            checkType: 'compare_benchmark',
            targetField: 'summary.cost.requests.byStage.attention',
            expectedChange: 'decrease',
            evidencePathHint: 'artifacts/p7-1-bench/<ts>/*/latest.summary.json',
            compareWindow: 'same parents; refresh_ms=0 vs refresh_ms>0; loops>=2',
          }),
          vcheck({
            checkType: 'compare_benchmark',
            targetField: 'summary.cost.refreshPlan.skippedByFreshCache',
            expectedChange: 'increase',
            evidencePathHint: 'artifacts/p7-1-bench/<ts>/*/latest.summary.json',
            compareWindow: 'same parents; refresh_ms=0 vs refresh_ms>0',
          }),
          vcheck({
            checkType: 'graded_gate',
            targetField: 'gateLevel',
            expectedChange: 'improve',
            evidencePathHint: 'scripts/p7_2_gate_mvp.sh output',
            compareWindow: 'after tuning; traceDir with summary.cost present',
            note: 'cost-related WARN/FAIL should reduce; SAFE_FOR_LONG_RUN should remain yes',
          }),
        ],
        [
          workflow({
            name: 're-run gate (after tuning)',
            reRunCommand: 'scripts/p7_2_gate_mvp.sh --dir <traceDir>',
            targetMetrics: ['gateLevel', 'releaseDisposition', 'gateReasons(code=attention_cost_high|refresh_skip_low)'],
            compareRule: 'gateLevel should improve (FAIL→WARN→PASS) and cost-related reasons should reduce',
            expectedOutcome: 'disposition moves toward long_run_ok; SAFE_FOR_LONG_RUN remains yes',
            passCondition: 'gateLevel!=FAIL',
          }),
          workflow({
            name: 're-run p7-1 benchmark (cost delta)',
            reRunCommand: 'scripts/p7_1_benchmark_mvp.sh (refresh_ms=0 vs refresh_ms>0)',
            targetMetrics: ['summary.cost.requests.byStage.attention', 'summary.cost.refreshPlan.skippedByFreshCache'],
            compareRule: 'attention decreases; skippedByFreshCache increases',
            expectedOutcome: 'attention cost growth slows with parent count; gating is effective',
            passCondition: 'skippedByFreshCache>0 and attention lower vs baseline',
          }),
        ]
      ));
    }
  }

  if (reasonCodes.has('refresh_skip_low') && skippedFresh === 0) {
    out.recommendedActions.push(action(
      'cost.refresh.not_working',
      'Refresh gating not saving requests: verify refresh_ms and cache behavior',
      [
        '1) Confirm A2A_PARENT_REFRESH_MS > 0 (otherwise gating is disabled).',
        '2) Confirm parent cache persists in state.json under the trace dir.',
        '3) Re-run with MAX_LOOPS>=2 and same TRACE_DIR to allow cache to become warm.',
      ],
      evidenceBase,
      [],
      [
        vcheck({
          checkType: 'field_presence',
          targetField: 'summary.cost.refreshPlan.skippedByFreshCache',
          expectedChange: 'become_nonzero',
          evidencePathHint: 'latest *.summary.json in traceDir',
          compareWindow: 'same traceDir across >=2 loops',
        }),
        vcheck({
          checkType: 'compare_runs',
          targetField: 'summary.cost.requests.byStage.attention',
          expectedChange: 'decrease_or_growth_slowdown',
          evidencePathHint: 'p7-1 benchmark latest.summary.json',
          compareWindow: 'refresh_ms=0 vs refresh_ms>0',
        }),
      ]
    ));
  }

  // precondition_failed / stale_skip mapping (from counts)
  const precond = Number(counts.precondition_failed || 0);
  const staleSkip = Number(counts.stale_skip || 0);
  if (precond > 0) {
    out.recommendedActions.push(action(
      'precondition.failed',
      'Precondition failed: reduce concurrency and verify progress surface',
      [
        '1) Inspect review_state_pre traces to see expected vs got (revisionRequested/pendingReview).',
        '2) Reduce duplicate instances to avoid racing state transitions.',
        '3) If the workflow changed upstream, update deterministic action mapping rather than retrying blindly.',
      ],
      evidenceBase,
      []
    ));
  }
  if (staleSkip > 0) {
    out.recommendedActions.push(action(
      'stale.skip',
      'Stale skip seen: treat as concurrency or eventual consistency signal',
      [
        '1) Inspect deliverable_get_2 / task_get / echo traces around the stale skip.',
        '2) Do not repeat side effects; let next loop re-read and converge.',
        '3) If frequent, reduce duplicate instances and increase poll interval slightly.',
      ],
      evidenceBase,
      []
    ));
  }

  // Include any recommended actions attached by gate (lightweight hints)
  for (const ra of gateRecommended) {
    out.recommendedActions.push(action(
      String(ra.id),
      String(ra.title || ra.id),
      [],
      evidenceBase,
      []
    ));
  }

  // Deduplicate actions by id
  const seen = new Set();
  out.recommendedActions = out.recommendedActions.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const gatePath = argv[0];
  if (!gatePath) {
    console.error('usage: scripts/p7_3_signal_to_action.mjs <gate.json>');
    process.exit(2);
  }
  const gate = readJson(gatePath);
  const traceDir = gate?.results?.[0]?.traceDir || gate?.results?.[0]?.traceDir || null;

  // Try to load summary from evidencePaths if present.
  let summary = null;
  const ev = gate?.results?.[0]?.evidencePaths || [];
  const summaryPath = ev.find(p => String(p).endsWith('.summary.json') || String(p).endsWith('latest.summary.json')) || null;
  if (summaryPath && fs.existsSync(summaryPath)) summary = readJson(summaryPath);

  // If summary missing, derive minimal counts from trace filenames (deterministic, best-effort)
  if (!summary && traceDir && fs.existsSync(traceDir)) {
    const files = fs.readdirSync(traceDir);
    const counts = {
      act_fail: 0,
      act_ok: 0,
      handoff: 0,
      wait: 0,
      noop: 0,
      HUMAN_ACTION_REQUIRED: 0,
      precondition_failed: 0,
      stale_skip: 0,
    };
    // act traces: treat ok:false as act_fail, ok:true as act_ok
    for (const f of files) {
      if (!f.endsWith('.act.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(`${traceDir}/${f}`, 'utf8'));
        if (j && j.ok === false) counts.act_fail += 1;
        else if (j && j.ok === true) counts.act_ok += 1;
      } catch {}
    }
    summary = { health: null, windowLoops: 0, counts, cost: null, perParent: null, perRole: null, hints: null };
  }

  const out = mapReasonsToActions({ gate, summary, decision: null, traceDir });
  try {
    process.stdout.write(JSON.stringify(out, null, 2));
  } catch (e) {
    // Best-effort: ignore broken pipe when consumer exits early.
  }
}

// Avoid noisy crashes when piping into consumers that exit early (e.g. head).
process.stdout.on('error', (e) => {
  if (e && e.code === 'EPIPE') process.exit(0);
});

main();
