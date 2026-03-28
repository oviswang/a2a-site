#!/usr/bin/env node

/**
 * A2A single-agent collaboration runner MVP.
 *
 * Deterministic loop:
 *   1) token check
 *   2) join/already_member check
 *   3) read attention
 *   4) choose top item by deterministic rule
 *   5) read task + events
 *   6) decide one next action (deterministic)
 *   7) execute action (conservative MVP)
 *   8) re-read task/events echo
 *   9) sleep / next loop
 *
 * Config (env):
 *   A2A_BASE_URL=https://a2a.fun
 *   A2A_AGENT_HANDLE=...
 *   A2A_AGENT_TOKEN=...          (or A2A_TOKEN_FILE=/path/to/token)
 *   A2A_PROJECT_SLUG=...         (project slug for membership check)
 *   A2A_PARENT_TASK_ID=...       (parent task id for attention)
 *   A2A_POLL_MS=30000
 *   A2A_TRACE_DIR=artifacts/a2a-runner
 *   A2A_MAX_LOOPS=0              (0=forever)
 */

import fs from 'node:fs';
import path from 'node:path';

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

const BASE_URL = env('A2A_BASE_URL', 'https://a2a.fun').replace(/\/$/, '');
const HANDLE = env('A2A_AGENT_HANDLE');
const TOKEN_DIRECT = env('A2A_AGENT_TOKEN');
const TOKEN_FILE = env('A2A_TOKEN_FILE');
const PROJECT_SLUG = env('A2A_PROJECT_SLUG');
const PARENT_TASK_ID = env('A2A_PARENT_TASK_ID');
const PARENT_TASK_IDS = env('A2A_PARENT_TASK_IDS');
const POLL_MS = Number(env('A2A_POLL_MS', '30000'));
const TRACE_DIR = env('A2A_TRACE_DIR', 'artifacts/a2a-runner');
const MAX_LOOPS = Number(env('A2A_MAX_LOOPS', '0'));

// P2-1: multi-agent stable run mode
// Role controls which attention types this runner is allowed to act on.
// - reviewer: handles awaiting_review (and optionally blocked)
// - worker: handles revision_requested (and optionally blocked)
// - any/empty: legacy single-agent behavior (handles all)
const ROLE = env('A2A_ROLE', '').trim().toLowerCase();
const VALID_ROLES = new Set(['', 'any', 'reviewer', 'worker']);
if (!VALID_ROLES.has(ROLE)) fatal(`invalid env: A2A_ROLE=${ROLE} (expected reviewer|worker|any)`);


function fatal(msg, code = 2) {
  console.error(`FATAL ${msg}`);
  process.exit(code);
}

function ensureTraceDirExists() {
  fs.mkdirSync(TRACE_DIR, { recursive: true });
}

if (!HANDLE) fatal('missing env: A2A_AGENT_HANDLE');
if (!PROJECT_SLUG) fatal('missing env: A2A_PROJECT_SLUG');
if (!PARENT_TASK_ID && !PARENT_TASK_IDS) fatal('missing env: A2A_PARENT_TASK_ID (single) or A2A_PARENT_TASK_IDS (multi) for /attention)');

function readToken() {
  if (TOKEN_DIRECT) return TOKEN_DIRECT.trim();
  if (TOKEN_FILE) {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (!t) throw new Error('empty_token_file');
    return t;
  }
  throw new Error('missing_token');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeIso(ts) {
  return new Date(ts).toISOString().replace(/[:.]/g, '-');
}

function tracePath(ts, kind) {
  return path.join(TRACE_DIR, `${safeIso(ts)}.${kind}.json`);
}

function writeTrace(ts, kind, obj) {
  fs.mkdirSync(TRACE_DIR, { recursive: true });
  fs.writeFileSync(tracePath(ts, kind), JSON.stringify(obj, null, 2));
}

// P4-1: structured decision trace + conflict governance codes
const CONFLICT_CODES = {
  role_skip: 'role_skip',
  yield_to_peer: 'yield_to_peer',
  // P6-2
  owner_stale: 'owner_stale',
  takeover: 'takeover',

  dedupe_skip: 'dedupe_skip',
  stale_skip: 'stale_skip',
  precondition_failed: 'precondition_failed',
  act_ok: 'act_ok',
  act_fail: 'act_fail',
  human_required_blocked_stale: 'human_required_blocked_stale',
};

function writeDecision(ts, decision) {
  writeTrace(ts, 'decision', decision);
}

// P4-3: lightweight windowed health summary
function initWindow() {
  return {
    loops: 0,
    counts: {
      act_ok: 0,
      act_fail: 0,
      role_skip: 0,
      handoff: 0,
      wait: 0,
      noop: 0,
      HUMAN_ACTION_REQUIRED: 0,
      stale_skip: 0,
      precondition_failed: 0,
      dedupe_skip: 0,
    },
    // P5-3 governance views
    perParent: {},
    perRole: {},
    last: [],
  };
}

function bump(win, decision) {
  win.loops += 1;
  const pd = decision.policyDecision;

  // global counts
  if (pd === 'act') {
    if (decision.reasonCode === CONFLICT_CODES.act_ok) win.counts.act_ok += 1;
    else if (decision.reasonCode === CONFLICT_CODES.act_fail) win.counts.act_fail += 1;
  }
  if (pd === 'handoff') {
    win.counts.handoff += 1;
    if (decision.reasonCode === CONFLICT_CODES.role_skip) win.counts.role_skip += 1;
  }
  if (pd === 'wait') win.counts.wait += 1;
  if (pd === 'noop') win.counts.noop += 1;
  if (pd === 'HUMAN_ACTION_REQUIRED') win.counts.HUMAN_ACTION_REQUIRED += 1;
  if (decision.reasonCode === CONFLICT_CODES.stale_skip) win.counts.stale_skip += 1;
  if (decision.reasonCode === CONFLICT_CODES.precondition_failed) win.counts.precondition_failed += 1;
  if (decision.reasonCode === CONFLICT_CODES.dedupe_skip) win.counts.dedupe_skip += 1;

  // P5-3 per-parent view (selected parent for the loop)
  const parentId = decision.selectedParentTaskId || decision.parentTaskId || null;
  if (parentId) {
    const p = (win.perParent[parentId] ||= {
      loops: 0,
      counts: { act_ok: 0, act_fail: 0, handoff: 0, wait: 0, noop: 0, HUMAN_ACTION_REQUIRED: 0, role_skip: 0, yield_to_peer: 0, stale_skip: 0, precondition_failed: 0, dedupe_skip: 0 },
      topTypeCounts: {},
      conflictCounts: {},
      last: [],
    });
    p.loops += 1;
    p.counts[pd] = (p.counts[pd] || 0) + 1;
    if (decision.reasonCode) {
      p.conflictCounts[decision.reasonCode] = (p.conflictCounts[decision.reasonCode] || 0) + 1;
      if (decision.reasonCode === CONFLICT_CODES.role_skip) p.counts.role_skip += 1;
      if (decision.reasonCode === CONFLICT_CODES.yield_to_peer) p.counts.yield_to_peer += 1;
      if (decision.reasonCode === CONFLICT_CODES.stale_skip) p.counts.stale_skip += 1;
      if (decision.reasonCode === CONFLICT_CODES.precondition_failed) p.counts.precondition_failed += 1;
      if (decision.reasonCode === CONFLICT_CODES.dedupe_skip) p.counts.dedupe_skip += 1;
      if (decision.reasonCode === CONFLICT_CODES.act_ok) p.counts.act_ok += 1;
      if (decision.reasonCode === CONFLICT_CODES.act_fail) p.counts.act_fail += 1;
    }
    const t = decision.top?.type || null;
    if (t) p.topTypeCounts[t] = (p.topTypeCounts[t] || 0) + 1;
    p.last.push({ loop: decision.loop, policyDecision: pd, reasonCode: decision.reasonCode, taskId: decision.top?.taskId || null, type: t, action: decision.chosenAction });
    if (p.last.length > 6) p.last.shift();
  }

  // P5-3 per-role view
  const role = decision.role || 'any';
  const r = (win.perRole[role] ||= {
    loops: 0,
    counts: { act_ok: 0, act_fail: 0, handoff: 0, wait: 0, noop: 0, HUMAN_ACTION_REQUIRED: 0 },
    conflictCounts: {},
    last: [],
  });
  r.loops += 1;
  r.counts[pd] = (r.counts[pd] || 0) + 1;
  if (decision.reasonCode) r.conflictCounts[decision.reasonCode] = (r.conflictCounts[decision.reasonCode] || 0) + 1;
  r.last.push({ loop: decision.loop, parentTaskId: parentId, policyDecision: pd, reasonCode: decision.reasonCode, taskId: decision.top?.taskId || null, type: decision.top?.type || null, action: decision.chosenAction });
  if (r.last.length > 6) r.last.shift();

  // short global tail
  win.last.push({
    loop: decision.loop,
    parentTaskId: parentId,
    policyDecision: decision.policyDecision,
    reasonCode: decision.reasonCode,
    taskId: decision.top?.taskId || null,
    type: decision.top?.type || null,
    action: decision.chosenAction,
  });
  if (win.last.length > 10) win.last.shift();
}

function healthOfCounts(counts, loops) {
  const c = counts;
  const spinning = Number(c.noop || 0) + Number(c.precondition_failed || 0) + Number(c.stale_skip || 0) + Number(c.dedupe_skip || 0);
  if (Number(c.act_ok || 0) === 0 && Number(c.wait || 0) === 0 && spinning >= Math.max(3, Math.floor(loops * 0.6))) return 'stuck';
  if (Number(c.act_fail || 0) > 0 || Number(c.HUMAN_ACTION_REQUIRED || 0) > 0) return 'degraded';
  return 'ok';
}

function healthOf(win) {
  return healthOfCounts(win.counts, win.loops);
}

function recoveryHints(win) {
  const c = win.counts;
  const hints = [];
  if (c.HUMAN_ACTION_REQUIRED > 0) {
    hints.push('HUMAN_ACTION_REQUIRED seen: check decision.json reasonCode (e.g. blocked_stale) and resolve manually before continuing.');
  }
  if (c.act_fail > 0) {
    hints.push('act_fail seen: inspect latest *.act.json and upstream API response bodies for deterministic error cause.');
  }
  if ((c.precondition_failed || 0) + (c.stale_skip || 0) > 0) {
    hints.push('precondition_failed/stale_skip seen: likely stale attention or concurrent runners; verify review-state/deliverable status and reduce duplicate instances.');
  }
  if (c.wait > 0 && c.act_ok === 0 && (c.handoff + c.role_skip) > 0) {
    hints.push('mostly wait/handoff: verify role boundary (A2A_ROLE) and that A2A_PARENT_TASK_ID points to the parent coordination task.');
  }

  // P5-3 governance hints (per-parent/role signals)
  const perParent = win.perParent || {};
  const parentHints = [];
  for (const [pid, p] of Object.entries(perParent)) {
    const h = healthOfCounts(p.counts, p.loops);
    if (h === 'stuck') parentHints.push({ parentTaskId: pid, health: h, reason: 'spinning_without_progress' });
    if ((p.counts.HUMAN_ACTION_REQUIRED || 0) > 0) parentHints.push({ parentTaskId: pid, health: 'degraded', reason: 'human_required' });
    if ((p.counts.act_fail || 0) > 0) parentHints.push({ parentTaskId: pid, health: 'degraded', reason: 'act_fail' });
    if ((p.counts.handoff || 0) > 0 && (p.topTypeCounts?.revision_requested || 0) > 0) {
      parentHints.push({ parentTaskId: pid, health: 'degraded', reason: 'work_present_but_handoff' });
    }
  }
  if (parentHints.length) {
    // Recommend the most severe parent first (stuck > degraded).
    parentHints.sort((a, b) => (a.health === 'stuck' ? -1 : 1) - (b.health === 'stuck' ? -1 : 1));
    hints.push({ governance: 'per_parent', recommend: parentHints.slice(0, 3) });
  }

  const perRole = win.perRole || {};
  const roleHints = [];
  for (const [role, r] of Object.entries(perRole)) {
    const loops = r.loops || 0;
    if (loops >= 5 && (r.counts.wait || 0) === loops) roleHints.push({ role, reason: 'all_wait' });
    if (loops >= 5 && (r.counts.handoff || 0) / loops > 0.8) roleHints.push({ role, reason: 'mostly_handoff' });
  }
  if (roleHints.length) hints.push({ governance: 'per_role', recommend: roleHints.slice(0, 3) });

  return hints;
}

async function readReviewState({ taskId, handle, token }) {
  // Lightweight fact surface for precondition/stale checks.
  return await httpJson(
    'GET',
    `/api/tasks/${encodeURIComponent(taskId)}/review-state?actorType=agent&actorHandle=${encodeURIComponent(handle)}`,
    { token }
  );
}

function isFresh(tsIso, maxAgeMs) {
  if (!tsIso) return false;
  const t = Date.parse(String(tsIso));
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= maxAgeMs;
}


async function httpJson(method, urlPath, { token, body } = {}) {
  const url = `${BASE_URL}${urlPath}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, error: 'non_json_response', raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json, urlPath, method };
}

// Deterministic priority
const TYPE_PRIORITY = {
  blocked: 0,
  revision_requested: 1,
  awaiting_review: 2,
};

function pickTopAttention(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] ?? 999;
    const pb = TYPE_PRIORITY[b.type] ?? 999;
    if (pa !== pb) return pa - pb;
    const ta = a.ts ? Date.parse(a.ts) : 0;
    const tb = b.ts ? Date.parse(b.ts) : 0;
    return tb - ta; // newest first
  });
  return sorted[0];
}

function parseParentCandidates() {
  const multi = String(PARENT_TASK_IDS || '').trim();
  if (multi) {
    const arr = multi.split(',').map((s) => s.trim()).filter(Boolean);
    return Array.from(new Set(arr));
  }
  return [String(PARENT_TASK_ID || '').trim()].filter(Boolean);
}

function attentionScore(top, counts) {
  const type = String(top?.type || '');
  const base = TYPE_PRIORITY[type] ?? 999;
  // Higher score = higher priority. We invert base priority.
  const typeScore = 1000 - base * 100;
  const c = counts || {};
  const countScore = Number(c.blocked || 0) * 30 + Number(c.revisionRequested || 0) * 20 + Number(c.awaitingReview || 0) * 10;
  const ts = top?.ts ? Date.parse(top.ts) : 0;
  const freshnessScore = ts ? Math.min(50, Math.floor((Date.now() - ts) / 1000) * -1) : 0;
  return typeScore + countScore + freshnessScore;
}

function pickParent(attByParent) {
  // Deterministic: compute score per parent; tie-break by input order then parent id.
  let best = null;
  for (const x of attByParent) {
    if (!x.attentionOk) continue;
    if (!x.top) continue;
    const score = attentionScore(x.top, x.counts);
    const cand = { ...x, score };
    if (!best) best = cand;
    else if (cand.score > best.score) best = cand;
  }
  return best;
}

// P6-1: per-parent refresh policy (deterministic, no scheduler)
function shouldRefreshParent({ parentId, cache, now, refreshMs, force }) {
  if (force) return { refresh: true, reason: 'force' };
  const ent = cache[parentId] || null;
  if (!ent) return { refresh: true, reason: 'cold' };
  const ageMs = now - Number(ent.lastFetchAt || 0);
  if (ageMs >= refreshMs) return { refresh: true, reason: 'stale' };
  return { refresh: false, reason: 'fresh_cache', ageMs };
}

function rrPick(parents, loop, k) {
  if (!parents.length) return [];
  const out = [];
  const start = loop % parents.length;
  for (let i = 0; i < Math.min(k, parents.length); i++) {
    out.push(parents[(start + i) % parents.length]);
  }
  return out;
}

// Minimal dedupe state (per task last signature)
function loadState() {
  const p = path.join(TRACE_DIR, 'state.json');
  try {
    const st = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!st.lastByTask) st.lastByTask = {};
    if (!st.yieldByItem) st.yieldByItem = {};
    return st;
  } catch {
    return { lastByTask: {}, yieldByItem: {} };
  }
}
function saveState(st) {
  fs.mkdirSync(TRACE_DIR, { recursive: true });
  fs.writeFileSync(path.join(TRACE_DIR, 'state.json'), JSON.stringify(st, null, 2));
}

function sigFor(itemType, action, extra = '') {
  return `${itemType}:${action}${extra ? ':' + extra : ''}`;
}

function normalizeNote(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 160);
}

function makeDeterministicPatch({ revisionNote, baseUrl, taskId }) {
  const note = normalizeNote(revisionNote);
  const ts = new Date().toISOString();
  return (
    `\n\n---\n` +
    `## Revision (runner MVP)\n\n` +
    `Addressed feedback: **${note || 'n/a'}**\n\n` +
    `- Added evidence placeholder link\n` +
    `- Timestamp: ${ts}\n\n` +
    `### Evidence\n` +
    `- (placeholder) ${baseUrl}/tasks/${taskId}\n`
  );
}

function classifyError(r) {
  const err = r?.json?.error || `http_${r?.status ?? 'unknown'}`;
  return String(err);
}

async function main() {
  const startedAt = Date.now();
  ensureTraceDirExists();

  let token = '';
  try {
    token = readToken();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'missing_token';
    const r = { ok: false, error: msg, hint: 'Set A2A_AGENT_TOKEN or A2A_TOKEN_FILE', env: {
      A2A_AGENT_HANDLE: HANDLE,
      A2A_PROJECT_SLUG: PROJECT_SLUG,
      A2A_PARENT_TASK_ID: PARENT_TASK_ID,
      A2A_BASE_URL: BASE_URL,
    }};
    writeTrace(Date.now(), 'fatal', r);
    console.error(`FATAL ${msg}`);
    console.error('HUMAN_ACTION_REQUIRED: provide agentToken (A2A_AGENT_TOKEN or A2A_TOKEN_FILE).');
    process.exit(3);
  }

  // 1) token self-check
  {
    const r = await httpJson('GET', '/api/auth/whoami', { token });
    writeTrace(Date.now(), 'token_check', r);
    if (!r.ok) {
      const err = classifyError(r);
      console.error(`FATAL token_check_failed: ${err}`);
      if (err === 'invalid_agent_token' || err === 'missing_bearer') {
        console.error('HUMAN_ACTION_REQUIRED: agentToken invalid/missing. Reissue requires human session (UI).');
      }
      process.exit(3);
    }
  }

  let loops = 0;
  const st = loadState();

  // P6-1 per-parent cache persisted in state.json (best-effort)
  if (!st.parentCache) st.parentCache = {};
  if (!st.lastSelectedParentTaskId) st.lastSelectedParentTaskId = null;
  // P6-2: per-item progress tracking for same-role coordination
  if (!st.progressByItem) st.progressByItem = {};

  // P4-3 rolling window summary
  const SUMMARY_EVERY = Number(env('A2A_SUMMARY_EVERY', '20'));
  let win = initWindow();

  while (MAX_LOOPS === 0 || loops < MAX_LOOPS) {
    loops += 1;
    const loopStart = Date.now();

    // P4-1 decision frame (filled progressively)
    const decision = {
      role: ROLE === '' ? 'any' : ROLE,
      handle: HANDLE,
      parentTaskId: PARENT_TASK_ID,
      parentTaskIds: parseParentCandidates(),
      selectedParentTaskId: null,
      parentCandidates: null,
      refreshPlan: null,
      loop: loops,
      featureFlags: {
        allowBlocked: env('A2A_ALLOW_BLOCKED', '0') === '1',
        blockedMaxAgeMs: Number(env('A2A_BLOCKED_MAX_AGE_MS', String(10 * 60 * 1000))),
        sameRoleCoordination: env('A2A_SAME_ROLE_COORDINATION', '0') === '1',
        yieldWindowMs: Number(env('A2A_YIELD_WINDOW_MS', '60000')),
      },
      coordinationMode: (env('A2A_SAME_ROLE_COORDINATION', '0') === '1') ? 'same_role_multi_instance' : 'single_instance',
      ownerHandle: null,
      selfIsOwner: null,
      yieldUntil: null,
      top: null,
      // P4-2 policy layer output
      policyDecision: null, // act|wait|handoff|noop|HUMAN_ACTION_REQUIRED
      chosenAction: 'noop',
      acted: false,
      skipped: false,
      reasonCode: null,
      reasonDetail: null,
      precondition: null,
    };

    // 2) membership check
    {
      const r = await httpJson('POST', `/api/projects/${encodeURIComponent(PROJECT_SLUG)}/join`, {
        token,
        body: { slug: PROJECT_SLUG, actorHandle: HANDLE, actorType: 'agent' },
      });
      writeTrace(Date.now(), 'join', r);
      if (!r.ok) {
        const err = classifyError(r);
        console.error(`[loop ${loops}] WARN join_failed: ${err}`);
        if (err === 'invalid_agent_token' || err === 'missing_bearer') {
          console.error('HUMAN_ACTION_REQUIRED: agentToken invalid/missing.');
          process.exit(3);
        }
        await sleep(POLL_MS);
        continue;
      }
    }

    // 3) attention (multi-parent deterministic) + P6-1 refresh policy
    const parents = parseParentCandidates();
    const now = Date.now();

    const refreshMs = Number(env('A2A_PARENT_REFRESH_MS', '0')) || 0;
    const SMALL_PARENT_ALL = Number(env('A2A_PARENT_SMALL_ALL', '5'));
    const RR_K = Number(env('A2A_PARENT_RR_K', '1'));

    const cache = st.parentCache;

    // Tiered refresh set
    let refreshSet = new Set();
    let reasons = {};

    const lastSel = st.lastSelectedParentTaskId;
    if (lastSel && parents.includes(lastSel)) {
      refreshSet.add(lastSel);
      reasons[lastSel] = (reasons[lastSel] || []).concat('last_selected');
    }

    // recently non-empty (cached)
    for (const pid of parents) {
      const ent = cache[pid];
      if (ent && ent.lastTop) {
        refreshSet.add(pid);
        reasons[pid] = (reasons[pid] || []).concat('recent_non_empty');
      }
    }

    // degraded/stuck from cached health
    for (const pid of parents) {
      const ent = cache[pid];
      if (ent && (ent.lastHealth === 'degraded' || ent.lastHealth === 'stuck')) {
        refreshSet.add(pid);
        reasons[pid] = (reasons[pid] || []).concat(`health_${ent.lastHealth}`);
      }
    }

    // Deterministic round-robin supplement
    for (const pid of rrPick(parents, loops, RR_K)) {
      refreshSet.add(pid);
      reasons[pid] = (reasons[pid] || []).concat('round_robin');
    }

    // Small parent count: keep current behavior (full refresh)
    const small = parents.length <= SMALL_PARENT_ALL;
    if (small) {
      refreshSet = new Set(parents);
      for (const pid of parents) reasons[pid] = (reasons[pid] || []).concat('small_all');
    }

    // If refreshMs==0, preserve old behavior (always refresh all)
    if (refreshMs <= 0) {
      refreshSet = new Set(parents);
      for (const pid of parents) reasons[pid] = (reasons[pid] || []).concat('refresh_ms_disabled');
    }

    decision.refreshPlan = parents.map((pid) => {
      const want = refreshSet.has(pid);
      const ent = cache[pid] || null;
      const ageMs = ent ? (now - Number(ent.lastFetchAt || 0)) : null;
      // If selected by tier but cache is still fresh and refreshMs>0, we can skip network fetch.
      const gate = (refreshMs > 0) ? shouldRefreshParent({ parentId: pid, cache, now, refreshMs, force: want }) : { refresh: true, reason: 'disabled' };
      return {
        parentTaskId: pid,
        selectedByTier: want,
        tierReasons: reasons[pid] || [],
        cacheAgeMs: ageMs,
        willFetch: !!gate.refresh,
        fetchReason: gate.reason,
      };
    });

    const attByParent = [];

    for (const pid of parents) {
      const plan = decision.refreshPlan.find((x) => x.parentTaskId === pid);
      const ent = cache[pid] || null;

      let att = null;
      let fromCache = false;

      if (plan && plan.willFetch) {
        att = await httpJson('GET', `/api/tasks/${encodeURIComponent(pid)}/attention`, {});
        writeTrace(Date.now(), `attention.${pid}`, att);
        const ok = !!att.ok;
        const items = att.json?.items || [];
        const top = pickTopAttention(items);
        const counts = att.json?.counts || null;

        // update cache snapshot
        cache[pid] = {
          lastFetchAt: Date.now(),
          lastCounts: counts,
          lastTop: top ? { taskId: String(top.taskId), type: String(top.type), ts: top.ts || null } : null,
          lastItemsLen: Array.isArray(items) ? items.length : 0,
          lastHealth: null,
        };
        saveState(st);

        attByParent.push({ parentTaskId: pid, attentionOk: ok, counts, top, itemsLen: Array.isArray(items) ? items.length : 0, fromCache });
      } else if (ent) {
        // cached snapshot
        fromCache = true;
        const top = ent.lastTop || null;
        attByParent.push({ parentTaskId: pid, attentionOk: true, counts: ent.lastCounts || null, top, itemsLen: Number(ent.lastItemsLen || 0), fromCache });
      } else {
        // no cache and not fetching (should be rare) → treat as unavailable
        attByParent.push({ parentTaskId: pid, attentionOk: false, counts: null, top: null, itemsLen: 0, fromCache });
      }
    }

    decision.parentCandidates = attByParent.map((x) => ({
      parentTaskId: x.parentTaskId,
      attentionOk: x.attentionOk,
      counts: x.counts,
      top: x.top ? { taskId: String(x.top.taskId), type: String(x.top.type), ts: x.top.ts || null } : null,
      itemsLen: x.itemsLen,
      fromCache: !!x.fromCache,
      score: x.top ? attentionScore(x.top, x.counts) : null,
    }));

    const picked = pickParent(attByParent);
    if (!picked) {
      decision.policyDecision = 'wait';
      decision.skipped = true;
      decision.reasonCode = 'idle_no_attention';
      decision.reasonDetail = { parentsTried: parents };
      writeDecision(Date.now(), decision);
      bump(win, decision);
      if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
        const health = healthOf(win);
        const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
        const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
        const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: parents[0] || null, windowLoops: win.loops, counts: win.counts, health, perParent, perRole, hints: recoveryHints(win), last: win.last };
        writeTrace(Date.now(), 'summary', summary);
      }
      console.log(`[loop ${loops}] idle: no attention items (parents=${parents.join(',')})`);
      await sleep(POLL_MS);
      continue;
    }

    decision.selectedParentTaskId = picked.parentTaskId;

    const top = picked.top;
    decision.top = { taskId: String(top.taskId), type: String(top.type), ts: top.ts || null };

    const taskId = String(top.taskId);

    // P5-1: same-role multi-instance coordination (deterministic, no locks)
    const SAME_ROLE = env('A2A_SAME_ROLE_COORDINATION', '0') === '1';
    const YIELD_WINDOW_MS = Number(env('A2A_YIELD_WINDOW_MS', '60000'));
    const HANDLES_RAW = env('A2A_SAME_ROLE_HANDLES', '').trim();
    if (SAME_ROLE) {
      const handles = HANDLES_RAW ? HANDLES_RAW.split(',').map((s) => s.trim()).filter(Boolean) : [];
      // If misconfigured, fall back to single-instance semantics.
      if (handles.length >= 2 && handles.includes(HANDLE)) {
        const sorted = [...handles].sort();
        const itemType = String(top.type);
        const key = `${taskId}:${itemType}`;

        // Deterministic owner ring
        let h = 0;
        for (const ch of key) h = (h + ch.charCodeAt(0)) >>> 0;
        const ownerIdx = h % sorted.length;
        const owner = sorted[ownerIdx];

        // P6-2: progress signature for stale-owner detection (fact-surface based)
        const OWNER_STALE_MS = Number(env('A2A_OWNER_STALE_MS', '120000'));
        const prog = (st.progressByItem[key] ||= { lastProgressSig: null, lastProgressAt: 0 });
        const rsProg = await readReviewState({ taskId, handle: HANDLE, token });
        writeTrace(Date.now(), 'review_state_progress', rsProg);
        const sig = rsProg.ok && rsProg.json && rsProg.json.ok
          ? `${String(rsProg.json.deliverableStatus || '')}:${String(rsProg.json.submittedAt || '')}:${String(rsProg.json.reviewedAt || '')}`
          : `err:${rsProg.status}:${String(rsProg.json?.error || '')}`;
        const now = Date.now();
        if (prog.lastProgressSig !== sig) {
          prog.lastProgressSig = sig;
          prog.lastProgressAt = now;
        }
        saveState(st);

        const ownerStale = (owner !== HANDLE) && prog.lastProgressAt && (now - prog.lastProgressAt) >= OWNER_STALE_MS;
        const takeoverBy = sorted[(ownerIdx + 1) % sorted.length];

        // Record owner info in decision
        decision.ownerHandle = owner;
        decision.selfIsOwner = owner === HANDLE;

        // If owner is stale, allow deterministic takeover by next owner in ring.
        if (ownerStale) {
          decision.reasonCode = CONFLICT_CODES.owner_stale;
          decision.reasonDetail = { ownerHandle: owner, ownerStale: true, ownerStaleMs: now - prog.lastProgressAt, takeoverBy, takeoverFrom: owner };
          if (takeoverBy === HANDLE) {
            // We become acting owner for this loop.
            decision.ownerHandle = takeoverBy;
            decision.selfIsOwner = true;
            decision.reasonCode = CONFLICT_CODES.takeover;
          } else {
            // Not our turn to take over; yield.
            const until = now + YIELD_WINDOW_MS;
            st.yieldByItem[key] = until;
            saveState(st);
            decision.policyDecision = 'handoff';
            decision.skipped = true;
            decision.reasonCode = CONFLICT_CODES.owner_stale;
            decision.yieldUntil = new Date(until).toISOString();
            writeDecision(Date.now(), decision);
            bump(win, decision);
            await sleep(POLL_MS);
            continue;
          }
        }

        // Yield window check (normal)
        const until = Number(st.yieldByItem?.[key] || 0);
        if (until && now < until && owner !== HANDLE && !ownerStale) {
          decision.policyDecision = 'handoff';
          decision.skipped = true;
          decision.reasonCode = CONFLICT_CODES.yield_to_peer;
          decision.reasonDetail = { ownerHandle: owner, yieldUntil: new Date(until).toISOString() };
          decision.yieldUntil = new Date(until).toISOString();
          writeDecision(Date.now(), decision);
          bump(win, decision);
          await sleep(POLL_MS);
          continue;
        }

        // Standard owner gating (if not stale takeover)
        if (owner !== HANDLE && !ownerStale) {
          const newUntil = now + YIELD_WINDOW_MS;
          st.yieldByItem[key] = newUntil;
          saveState(st);
          decision.policyDecision = 'handoff';
          decision.skipped = true;
          decision.reasonCode = CONFLICT_CODES.yield_to_peer;
          decision.reasonDetail = { ownerHandle: owner, yieldUntil: new Date(newUntil).toISOString() };
          decision.yieldUntil = new Date(newUntil).toISOString();
          writeDecision(Date.now(), decision);
          bump(win, decision);
          await sleep(POLL_MS);
          continue;
        }

        // If we get here, we are allowed to proceed (owner or takeover).
      }
    }
// 4) read task + events
    const task = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}`, {});
    writeTrace(Date.now(), 'task_get', task);
    if (!task.ok) {
      console.error(`[loop ${loops}] WARN task_get_failed: ${classifyError(task)}`);
      await sleep(POLL_MS);
      continue;
    }

    // 5) deterministic next action mapping (conservative MVP)
    // MVP action policy: no AI. Prefer safe, reversible, clearly-mapped side effects.
    // Priority mapping:
    // - blocked -> clear blocker (POST /api/tasks/{id}/block isBlocked:false)
    // - revision_requested -> revise + resubmit (PUT /deliverable then POST /deliverable/submit)
    // - awaiting_review -> review_accept (deliverable.review(accept))
    //
    // P2-1 role boundary:
    // - reviewer: only acts on awaiting_review (and blocked)
    // - worker: only acts on revision_requested (and blocked)
    // - any/empty: legacy behavior
    let action = 'noop';
    if (top.type === 'blocked') action = 'clear_blocker';
    if (top.type === 'revision_requested') action = 'revise_resubmit';
    if (top.type === 'awaiting_review') action = 'review_accept';

    const role = ROLE === '' ? 'any' : ROLE;

    // P3-B-1: tighten blocked handling by default to reduce toggle fights.
    // - reviewer: acts on awaiting_review (and blocked only if explicitly enabled)
    // - worker: acts on revision_requested (and blocked only if explicitly enabled)
    const ALLOW_BLOCKED = env('A2A_ALLOW_BLOCKED', '0') === '1';

    const allowedByRole = (role === 'any') ||
      (role === 'reviewer' && (top.type === 'awaiting_review' || (ALLOW_BLOCKED && top.type === 'blocked'))) ||
      (role === 'worker' && (top.type === 'revision_requested' || (ALLOW_BLOCKED && top.type === 'blocked')));

    if (!allowedByRole) {
      decision.policyDecision = 'handoff';
      decision.skipped = true;
      decision.reasonCode = CONFLICT_CODES.role_skip;
      decision.reasonDetail = { role, topType: top.type };
      decision.chosenAction = action;
      writeDecision(Date.now(), decision);
      bump(win, decision);
      if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
        const health = healthOf(win);
        const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
        const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
        const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
        writeTrace(Date.now(), 'summary', summary);
      }
      console.log(`[loop ${loops}] role_skip role=${role} top=${top.type} task=${taskId}`);
      await sleep(POLL_MS);
      continue;
    }

    // 6) minimal dedupe
    // - revision_requested: dedupe by (taskId + normalized revisionNote)
    // - awaiting_review: dedupe by (taskId + submittedAt)
    let sigExtra = '';

    if (action === 'revise_resubmit') {
      const d0 = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}/deliverable`, {});
      writeTrace(Date.now(), 'deliverable_get', d0);
      const note = d0.json?.deliverable?.revisionNote;
      sigExtra = normalizeNote(note);
    }

    if (action === 'review_accept') {
      const d0 = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}/deliverable`, {});
      writeTrace(Date.now(), 'deliverable_get', d0);
      const del = d0.json?.deliverable;
      sigExtra = del?.submittedAt ? String(del.submittedAt) : `status:${String(del?.status || 'none')}`;
    }

    const sig = sigFor(top.type, action, sigExtra);
    if (st.lastByTask[taskId] === sig) {
      decision.policyDecision = 'noop';
      decision.skipped = true;
      decision.reasonCode = CONFLICT_CODES.dedupe_skip;
      decision.reasonDetail = { sig };
      decision.chosenAction = action;
      decision.precondition = { sig };
      writeDecision(Date.now(), decision);
      bump(win, decision);
      if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
        const health = healthOf(win);
        const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
        const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
        const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
        writeTrace(Date.now(), 'summary', summary);
      }
      console.log(`[loop ${loops}] dedupe: skip ${sig} task=${taskId}`);
      await sleep(POLL_MS);
      continue;
    }

    decision.chosenAction = action;

    // 7) execute action
    // Note: action may involve multiple calls; we record each step into traces.
    let actResult = { ok: true, skipped: true, reason: 'noop_mvp', action };

    if (action === 'clear_blocker') {
      // P4-1: conservative blocked handling: enforce freshness or require human.
      const BLOCKED_MAX_AGE_MS = Number(env('A2A_BLOCKED_MAX_AGE_MS', String(10 * 60 * 1000)));
      const fresh = isFresh(top.ts, BLOCKED_MAX_AGE_MS);
      decision.precondition = { kind: 'blocked_freshness', topTs: top.ts || null, fresh, maxAgeMs: BLOCKED_MAX_AGE_MS };

      if (!fresh) {
        decision.policyDecision = 'HUMAN_ACTION_REQUIRED';
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.human_required_blocked_stale;
        writeDecision(Date.now(), decision);
        bump(win, decision);
        if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
          const health = healthOf(win);
          const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
          const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
          const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
          writeTrace(Date.now(), 'summary', summary);
        }
        console.error(`[loop ${loops}] HUMAN_ACTION_REQUIRED blocked_stale task=${taskId}`);
        await sleep(POLL_MS);
        continue;
      }

      const r = await httpJson('POST', `/api/tasks/${encodeURIComponent(taskId)}/block`, {
        token,
        body: { isBlocked: false, actorHandle: HANDLE, actorType: 'agent' },
      });
      actResult = r;
      writeTrace(Date.now(), 'act', actResult);
    }

    if (action === 'revise_resubmit') {
      // P4-1: act-before-re-read: require review-state still says revisionRequested.
      const rs = await readReviewState({ taskId, handle: HANDLE, token });
      writeTrace(Date.now(), 'review_state_pre', rs);
      const ok = !!(rs.ok && rs.json && rs.json.ok);
      const revisionRequested = !!rs.json?.revisionRequested;
      decision.precondition = { kind: 'review_state', ok, revisionRequested, status: rs.status };

      if (!ok || !revisionRequested) {
        decision.policyDecision = 'noop';
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.precondition_failed;
        decision.reasonDetail = { expected: { revisionRequested: true }, got: { ok, revisionRequested } };
        writeDecision(Date.now(), decision);
        bump(win, decision);
        if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
          const health = healthOf(win);
          const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
          const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
          const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
          writeTrace(Date.now(), 'summary', summary);
        }
        await sleep(POLL_MS);
        continue;
      }

      decision.policyDecision = 'act';

      // read deliverable
      const d1 = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}/deliverable`, {});
      writeTrace(Date.now(), 'deliverable_get_2', d1);
      if (!d1.ok || !d1.json?.deliverable) {
        actResult = { ok: false, error: 'deliverable_missing', status: d1.status, json: d1.json, action };
        writeTrace(Date.now(), 'act', actResult);
      } else {
        const del = d1.json.deliverable;
        const patch = makeDeterministicPatch({ revisionNote: del.revisionNote, baseUrl: BASE_URL, taskId });
        const newSummary = String(del.summaryMd || '') + patch;
        const put = await httpJson('PUT', `/api/tasks/${encodeURIComponent(taskId)}/deliverable`, {
          token,
          body: {
            actorHandle: HANDLE,
            actorType: 'agent',
            summaryMd: newSummary,
            evidenceLinks: [{ label: 'placeholder', url: `${BASE_URL}/tasks/${taskId}` }],
          },
        });
        writeTrace(Date.now(), 'deliverable_put', put);

        if (!put.ok) {
          actResult = put;
          writeTrace(Date.now(), 'act', actResult);
        } else {
          const sub = await httpJson('POST', `/api/tasks/${encodeURIComponent(taskId)}/deliverable/submit`, {
            token,
            body: { actorHandle: HANDLE, actorType: 'agent' },
          });
          writeTrace(Date.now(), 'deliverable_submit', sub);
          actResult = sub;
          writeTrace(Date.now(), 'act', actResult);
        }
      }
    }

    if (action === 'review_accept') {
      // P4-1: act-before-re-read: require review-state still says pendingReview.
      const rs = await readReviewState({ taskId, handle: HANDLE, token });
      writeTrace(Date.now(), 'review_state_pre', rs);
      const ok = !!(rs.ok && rs.json && rs.json.ok);
      const pendingReview = !!rs.json?.pendingReview;
      decision.precondition = { kind: 'review_state', ok, pendingReview, status: rs.status };

      if (!ok || !pendingReview) {
        decision.policyDecision = 'noop';
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.precondition_failed;
        decision.reasonDetail = { expected: { pendingReview: true }, got: { ok, pendingReview } };
        writeDecision(Date.now(), decision);
        bump(win, decision);
        if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
          const health = healthOf(win);
          const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
          const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
          const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
          writeTrace(Date.now(), 'summary', summary);
        }
        await sleep(POLL_MS);
        continue;
      }

      decision.policyDecision = 'act';

      // Minimal, deterministic review policy:
      // - only accept if deliverable.status === 'submitted'
      const d1 = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}/deliverable`, {});
      writeTrace(Date.now(), 'deliverable_get_2', d1);
      const del = d1.json?.deliverable;
      const status = String(del?.status || '');

      if (!d1.ok || !del) {
        actResult = { ok: false, error: 'deliverable_missing', status: d1.status, json: d1.json, action };
        writeTrace(Date.now(), 'act', actResult);
      } else if (status !== 'submitted') {
        // This is effectively a stale/changed state; treat as stale skip.
        decision.policyDecision = 'noop';
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.stale_skip;
        decision.reasonDetail = { deliverableStatus: status, expected: 'submitted' };
        writeDecision(Date.now(), decision);
        bump(win, decision);
        if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
          const health = healthOf(win);
          const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, { loops: p.loops, counts: p.counts, health: healthOfCounts(p.counts, p.loops), topTypeCounts: p.topTypeCounts, conflictCounts: p.conflictCounts, last: p.last }]));
          const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, { loops: r.loops, counts: r.counts, health: healthOfCounts(r.counts, r.loops), conflictCounts: r.conflictCounts, last: r.last }]));
          const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID, windowLoops: win.loops, counts: win.counts, health, hints: recoveryHints(win), last: win.last , perParent, perRole };
          writeTrace(Date.now(), 'summary', summary);
        }
        await sleep(POLL_MS);
        continue;
      } else {
        const review = await httpJson('POST', `/api/tasks/${encodeURIComponent(taskId)}/deliverable/review`, {
          token,
          body: { actorHandle: HANDLE, actorType: 'agent', action: 'accept' },
        });
        writeTrace(Date.now(), 'deliverable_review', review);
        actResult = review;
        writeTrace(Date.now(), 'act', actResult);
      }
    }

    // 8) echo: re-read task
    const echo = await httpJson('GET', `/api/tasks/${encodeURIComponent(taskId)}`, {});
    writeTrace(Date.now(), 'echo', echo);

    // P4-1: finalize decision record
    decision.acted = !!actResult.ok && !actResult.skipped;
    decision.skipped = !!actResult.skipped;
    // If earlier branches set policyDecision, keep it; otherwise decide now.
    if (!decision.policyDecision) decision.policyDecision = decision.acted ? 'act' : 'noop';
    decision.reasonCode = actResult.ok ? CONFLICT_CODES.act_ok : CONFLICT_CODES.act_fail;
    if (!actResult.ok) decision.reasonDetail = { error: classifyError(actResult) };
    writeDecision(Date.now(), decision);

    // P4-3: update rolling window + periodic summary trace
    bump(win, decision);
    if (SUMMARY_EVERY > 0 && win.loops % SUMMARY_EVERY === 0) {
      const health = healthOf(win);
      // P5-3 governance summary: include perParent/perRole rollups
      const perParent = Object.fromEntries(Object.entries(win.perParent || {}).map(([pid, p]) => [pid, {
        loops: p.loops,
        counts: p.counts,
        health: healthOfCounts(p.counts, p.loops),
        topTypeCounts: p.topTypeCounts,
        conflictCounts: p.conflictCounts,
        last: p.last,
      }]));
      const perRole = Object.fromEntries(Object.entries(win.perRole || {}).map(([rk, r]) => [rk, {
        loops: r.loops,
        counts: r.counts,
        health: healthOfCounts(r.counts, r.loops),
        conflictCounts: r.conflictCounts,
        last: r.last,
      }]));

      const summary = { ok: true, kind: 'summary', role: decision.role, handle: HANDLE, parentTaskId: PARENT_TASK_ID || (decision.parentTaskIds && decision.parentTaskIds[0]) || null, windowLoops: win.loops, counts: win.counts, health, perParent, perRole, hints: recoveryHints(win), last: win.last };
      writeTrace(Date.now(), 'summary', summary);
    }

    st.lastByTask[taskId] = sig;
    saveState(st);

    console.log(
      `[loop ${loops}] top=${top.type} task=${taskId} action=${action} ` +
        `items=${items.length} act_ok=${!!actResult.ok} echo_ok=${echo.ok}`
    );

    // 9) sleep
    const elapsed = Date.now() - loopStart;
    const wait = Math.max(1000, POLL_MS - elapsed);
    await sleep(wait);
  }

  console.log(`done loops=${loops} uptime_ms=${Date.now() - startedAt}`);
}

main().catch((e) => {
  console.error('FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
