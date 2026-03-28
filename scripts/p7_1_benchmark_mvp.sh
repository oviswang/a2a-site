#!/usr/bin/env bash
set -euo pipefail

# P7-1: deterministic micro-benchmark runner (MVP)
# - Not a load test.
# - Runs a few fixed env combinations with small loop counts.
# - Produces a comparable index for trace dirs + latest summary snapshots.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_ROOT="${ROOT_DIR}/artifacts/p7-1-bench"
mkdir -p "${OUT_ROOT}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="${OUT_ROOT}/${TS}"
mkdir -p "${RUN_DIR}"

# Required shared env (must be set by caller)
: "${A2A_BASE_URL:?missing A2A_BASE_URL}"
: "${A2A_AGENT_HANDLE:?missing A2A_AGENT_HANDLE}"
: "${A2A_TOKEN_FILE:?missing A2A_TOKEN_FILE}"
: "${A2A_PROJECT_SLUG:?missing A2A_PROJECT_SLUG}"

# Parent sets (caller supplies actual IDs)
: "${P7_PARENTS_SMALL:?missing P7_PARENTS_SMALL (comma-separated parent task ids)}"
: "${P7_PARENTS_MEDIUM:?missing P7_PARENTS_MEDIUM}"
: "${P7_PARENTS_LARGE:?missing P7_PARENTS_LARGE}"

MAX_LOOPS="${P7_MAX_LOOPS:-3}"
POLL_MS="${P7_POLL_MS:-1000}"
REFRESH_MS_ON="${P7_REFRESH_MS_ON:-60000}"

run_one() {
  local name="$1"
  local parents="$2"
  local refresh_ms="$3"
  local same_role="$4"

  local trace_dir="${RUN_DIR}/${name}"
  mkdir -p "${trace_dir}"

  (
    export A2A_TRACE_DIR="${trace_dir}"
    export A2A_PARENT_TASK_IDS="${parents}"
    export A2A_PARENT_TASK_ID="" # ensure multi-parent path
    export A2A_MAX_LOOPS="${MAX_LOOPS}"
    export A2A_POLL_MS="${POLL_MS}"
    export A2A_PARENT_REFRESH_MS="${refresh_ms}"
    export A2A_SAME_ROLE_COORDINATION="${same_role}"

    node "${ROOT_DIR}/scripts/a2a_runner_mvp.mjs" >"${trace_dir}/stdout.log" 2>"${trace_dir}/stderr.log" || true
  )

  # Capture newest summary snapshot for quick diffing
  local latest_summary
  latest_summary="$(ls -1 "${trace_dir}"/*.summary.json 2>/dev/null | tail -n 1 || true)"
  if [[ -n "${latest_summary}" ]]; then
    cp -f "${latest_summary}" "${trace_dir}/latest.summary.json"
  fi

  echo "${name} ${trace_dir}" >>"${RUN_DIR}/index.txt"
}

# Matrix: size x refresh x same-role
run_one "small.refresh0.samerole0" "${P7_PARENTS_SMALL}" "0" "0"
run_one "small.refreshOn.samerole0" "${P7_PARENTS_SMALL}" "${REFRESH_MS_ON}" "0"
run_one "medium.refresh0.samerole0" "${P7_PARENTS_MEDIUM}" "0" "0"
run_one "medium.refreshOn.samerole0" "${P7_PARENTS_MEDIUM}" "${REFRESH_MS_ON}" "0"
run_one "large.refresh0.samerole0" "${P7_PARENTS_LARGE}" "0" "0"
run_one "large.refreshOn.samerole0" "${P7_PARENTS_LARGE}" "${REFRESH_MS_ON}" "0"

# Same-role on (single representative size)
run_one "medium.refreshOn.samerole1" "${P7_PARENTS_MEDIUM}" "${REFRESH_MS_ON}" "1"

echo "ok run_dir=${RUN_DIR}"
