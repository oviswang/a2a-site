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
USAGE
}

case "$cmd" in
  run)
    exec node scripts/a2a_runner_mvp.mjs "$@"
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
