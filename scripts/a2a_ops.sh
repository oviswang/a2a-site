#!/usr/bin/env bash
set -euo pipefail

# a2a_ops.sh — unified ops entry (P2-2)
#
# run      : long-running runner loop
# scenario : deterministic replay / acceptance / demo
# check    : lightweight health verification

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

cmd=${1:-}
shift || true

usage() {
  cat <<'USAGE'
Usage:
  scripts/a2a_ops.sh run [runner-args]
  scripts/a2a_ops.sh scenario [phase12]
  scripts/a2a_ops.sh check [publication]
  scripts/a2a_ops.sh inspect latest --dir <traceDir>

Commands:
  run:
    Runs the deterministic collaboration runner.
    Env-driven; see docs/runner-quickstart.md.

  scenario:
    phase12   Replay/demo/acceptance script.

  check:
    publication   Verify public publication source-of-truth surfaces.

Examples:
  # run (single agent)
  A2A_AGENT_HANDLE=... A2A_TOKEN_FILE=... A2A_PROJECT_SLUG=... A2A_PARENT_TASK_ID=... \
  scripts/a2a_ops.sh run

  # run (multi-agent role-gated)
  A2A_ROLE=reviewer ... scripts/a2a_ops.sh run
  A2A_ROLE=worker   ... scripts/a2a_ops.sh run

  # scenario
  scripts/a2a_ops.sh scenario phase12

  # check
  scripts/a2a_ops.sh check publication

  # inspect (latest evidence)
  scripts/a2a_ops.sh inspect latest --dir artifacts/a2a-runner
USAGE
}

case "$cmd" in
  run)
    exec node scripts/a2a_runner_mvp.mjs "$@"
    ;;

  inspect)
    sub=${1:-}
    shift || true
    if [[ "$sub" != "latest" ]]; then
      echo "Usage: scripts/a2a_ops.sh inspect latest --dir <traceDir>" >&2
      exit 2
    fi
    # Do NOT shift again here; we need to parse --dir from remaining args.
    dir=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --dir)
          dir=${2:-}
          shift 2
          ;;
        *)
          echo "Unknown arg: $1" >&2
          exit 2
          ;;
      esac
    done
    if [[ -z "$dir" ]]; then
      echo "Missing --dir" >&2
      exit 2
    fi
    if [[ ! -d "$dir" ]]; then
      echo "Trace dir not found: $dir" >&2
      exit 2
    fi

    echo "inspect.latest dir=$dir"

    # list latest few trace files (ignore state.json)
    ls -1t "$dir" | egrep -v '^state\.json$' | head -n 12 | sed 's/^/file: /'

    latest=$(ls -1t "$dir" | egrep -E '\.json$' | head -n 1 || true)
    if [[ -z "$latest" ]]; then
      echo "no json traces found" >&2
      exit 0
    fi

    echo "--- latest_json=$dir/$latest"
    # print minimal summary fields from the trace shape {ok,status,json,urlPath,method}
    python3 - "$dir/$latest" <<'PY'
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,'r',encoding='utf-8'))
except Exception as e:
  print('parse_failed',e)
  raise SystemExit(0)

print('ok:', j.get('ok'))
print('status:', j.get('status'))
print('method:', j.get('method'))
print('urlPath:', j.get('urlPath'))
body=j.get('json')
if isinstance(body, dict):
  # common keys
  for k in ['error','mode','requestId','parentTaskId']:
    if k in body:
      print(f'{k}:', body.get(k))
  if 'counts' in body:
    print('counts:', body.get('counts'))
  if 'items' in body and isinstance(body.get('items'), list):
    items=body.get('items')
    print('items_len:', len(items))
    if items:
      top=items[0]
      print('top_item:', {k: top.get(k) for k in ['type','taskId','title','reason','ts'] if isinstance(top, dict)})
PY

    echo "--- recommended_actions (P7-3)"
    # best-effort: run gate + signal->action on the trace dir (no hard dependency)
    if [[ -x scripts/p7_2_gate_mvp.sh && -f scripts/p7_3_signal_to_action.mjs ]]; then
      tmp_gate="$dir/.tmp_gate.json"
      scripts/p7_2_gate_mvp.sh --dir "$dir" > "$tmp_gate" || true
      node scripts/p7_3_signal_to_action.mjs "$tmp_gate" 2>/dev/null | python3 - <<'PY'
import json,sys
raw=sys.stdin.read().strip()
if not raw:
  raise SystemExit(0)
try:
  j=json.loads(raw)
except Exception:
  raise SystemExit(0)
acts=j.get('recommendedActions') or []
for a in acts[:6]:
  print('-', a.get('id'), a.get('title'))
PY
      rm -f "$tmp_gate" || true
    fi

    exit 0
    ;;

  scenario)
    which=${1:-phase12}
    shift || true
    case "$which" in
      phase12)
        exec bash scripts/demo_phase12_replay.sh "$@"
        ;;
      *)
        echo "Unknown scenario: $which" >&2
        usage
        exit 2
        ;;
    esac
    ;;

  check)
    which=${1:-publication}
    shift || true
    case "$which" in
      publication)
        exec bash scripts/verify_publication_sources.sh "$@"
        ;;
      *)
        echo "Unknown check: $which" >&2
        usage
        exit 2
        ;;
    esac
    ;;

  -h|--help|help|"")
    usage
    exit 0
    ;;

  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 2
    ;;
esac
