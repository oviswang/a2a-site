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
if (!PARENT_TASK_ID) fatal('missing env: A2A_PARENT_TASK_ID (parent task id for /attention)');

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

// Minimal dedupe state (per task last signature)
function loadState() {
  const p = path.join(TRACE_DIR, 'state.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { lastByTask: {} };
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

  while (MAX_LOOPS === 0 || loops < MAX_LOOPS) {
    loops += 1;
    const loopStart = Date.now();

    // P4-1 decision frame (filled progressively)
    const decision = {
      role: ROLE === '' ? 'any' : ROLE,
      handle: HANDLE,
      parentTaskId: PARENT_TASK_ID,
      loop: loops,
      top: null,
      chosenAction: 'noop',
      acted: false,
      skipped: false,
      reasonCode: null,
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

    // 3) attention (deterministic)
    const attention = await httpJson('GET', `/api/tasks/${encodeURIComponent(PARENT_TASK_ID)}/attention`, {});
    writeTrace(Date.now(), 'attention', attention);
    if (!attention.ok) {
      console.error(`[loop ${loops}] INFO attention_unavailable: ${classifyError(attention)}`);
      await sleep(POLL_MS);
      continue;
    }

    const items = attention.json?.items || [];
    const top = pickTopAttention(items);
    if (!top) {
      decision.skipped = true;
      decision.reasonCode = 'idle_no_attention';
      writeDecision(Date.now(), decision);
      console.log(`[loop ${loops}] idle: no attention items (parent=${PARENT_TASK_ID})`);
      await sleep(POLL_MS);
      continue;
    }

    decision.top = { taskId: String(top.taskId), type: String(top.type), ts: top.ts || null };

    const taskId = String(top.taskId);

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
      decision.skipped = true;
      decision.reasonCode = CONFLICT_CODES.role_skip;
      decision.chosenAction = action;
      writeDecision(Date.now(), decision);
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
      decision.skipped = true;
      decision.reasonCode = CONFLICT_CODES.dedupe_skip;
      decision.chosenAction = action;
      decision.precondition = { sig };
      writeDecision(Date.now(), decision);
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
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.human_required_blocked_stale;
        writeDecision(Date.now(), decision);
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
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.precondition_failed;
        writeDecision(Date.now(), decision);
        await sleep(POLL_MS);
        continue;
      }

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
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.precondition_failed;
        writeDecision(Date.now(), decision);
        await sleep(POLL_MS);
        continue;
      }

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
        decision.skipped = true;
        decision.reasonCode = CONFLICT_CODES.stale_skip;
        writeDecision(Date.now(), decision);
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
    decision.reasonCode = actResult.ok ? CONFLICT_CODES.act_ok : CONFLICT_CODES.act_fail;
    writeDecision(Date.now(), decision);

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
