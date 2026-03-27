#!/usr/bin/env bash
set -euo pipefail

# P0-1 Publication Source-of-Truth Verification (MVP)
#
# Goal:
# - provide a repeatable PASS/FAIL verification entry for public publication surfaces
# - detect drift between:
#     (1) GitHub / repo source-of-truth (a2a-site)
#     (2) online runtime routes (Next.js)
#     (3) online static markdown (skill.md/rules.md/heartbeat.md)
# - explicitly flag old repo a2a-fun as non-authoritative
#
# This script does NOT change production. It only verifies and reports.

BASE_URL=${A2A_BASE_URL:-https://a2a.fun}
REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

PASS=true
HARD_FAIL_ON_MISSING_SOT=${HARD_FAIL_ON_MISSING_SOT:-1}  # 1 = fail when a required public surface has no repo source-of-truth


say() { printf "%s\n" "$*"; }
fail() { PASS=false; say "FAIL: $*"; }
warn() { say "WARN: $*"; }

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

fetch() {
  local url=$1
  local out=$2
  curl -fsSL --max-time 20 -D "${out}.headers" "$url" -o "$out"
}

header() {
  local headers=$1
  local key=$2
  awk -v k="$key" 'BEGIN{IGNORECASE=1} $0 ~ "^"k":" {sub(/\r$/,"",$0); print substr($0, index($0,":")+2)}' "$headers" | tail -n 1
}

has_nextjs_headers() {
  local headers=$1
  grep -qiE 'x-nextjs|next-router-state-tree|x-powered-by: Next.js' "$headers"
}

say "P0-1 publication verification (MVP)"
say "- repo: a2a-site"
say "- repo_root: ${REPO_ROOT}"
say "- base_url: ${BASE_URL}"
say ""

# 0) Hard rule: must be running inside a2a-site
if [[ ! -f "${REPO_ROOT}/README.md" || ! -d "${REPO_ROOT}/web" ]]; then
  fail "Not in a2a-site repo root (missing README.md or web/)"
fi

if git -C "${REPO_ROOT}" remote -v 2>/dev/null | grep -q 'github.com/oviswang/a2a-site.git'; then
  say "OK: git remote matches oviswang/a2a-site"
else
  warn "git remote does not match https://github.com/oviswang/a2a-site.git (check repo)"
fi

# 1) GitHub README (repo truth)
README_SHA=$(sha256_file "${REPO_ROOT}/README.md")
say "OK: README.md sha256=${README_SHA} (repo truth)"

# 2) /faq must be Next.js route from a2a-site/web
say ""
URL_FAQ="${BASE_URL}/faq"
TMP_FAQ=$(mktemp)
fetch "$URL_FAQ" "$TMP_FAQ" || { fail "fetch failed: $URL_FAQ"; }
if has_nextjs_headers "${TMP_FAQ}.headers"; then
  say "OK: /faq appears served by Next.js (x-nextjs/Next.js headers present)"
else
  fail "/faq does not look like Next.js (expected a2a-site/web route). headers=$(head -n 20 "${TMP_FAQ}.headers" | tr '\n' '|' )"
fi

# Local source-of-truth file exists?
if [[ -f "${REPO_ROOT}/web/src/app/faq/page.tsx" ]]; then
  say "OK: source-of-truth exists: web/src/app/faq/page.tsx"
else
  fail "missing source-of-truth file: web/src/app/faq/page.tsx"
fi

# 3) /skill.md, /rules.md, /heartbeat.md: detect drift
say ""
for path in skill.md rules.md heartbeat.md; do
  url="${BASE_URL}/${path}"
  tmp=$(mktemp)
  if fetch "$url" "$tmp"; then
    ct=$(header "${tmp}.headers" "content-type")
    lm=$(header "${tmp}.headers" "last-modified")
    et=$(header "${tmp}.headers" "etag")
    say "OK: fetched ${url}"
    say "  content-type: ${ct:-unknown}"
    say "  last-modified: ${lm:-unknown}"
    say "  etag: ${et:-unknown}"

    # Expected repo file (current stage target): docs/public/<path>
    local_expected="${REPO_ROOT}/docs/public/${path}"
    if [[ -f "$local_expected" ]]; then
      local_sha=$(sha256_file "$local_expected")
      remote_sha=$(sha256_file "$tmp")

      # Allow a2a-site to add a tiny repo-only header comment without failing the drift check.
      # This keeps "truth file" self-identifying while still matching online content.
      tmp_norm=$(mktemp)
      local_norm=$(mktemp)
      python3 - "$local_expected" "$tmp" "$local_norm" "$tmp_norm" <<'PY'
import re,sys

local_in, remote_in, local_out, remote_out = sys.argv[1:5]

def norm(p):
  s=open(p,'r',encoding='utf-8').read()
  # drop one leading source-of-truth comment block if present
  s=re.sub(r'^<!--\s*source-of-truth:.*?-->\s*\n\s*\n', '', s, flags=re.S)
  return s

open(local_out,'w',encoding='utf-8').write(norm(local_in))
open(remote_out,'w',encoding='utf-8').write(norm(remote_in))
PY

      local_sha2=$(sha256_file "$local_norm")
      remote_sha2=$(sha256_file "$tmp_norm")

      rm -f "$tmp_norm" "$local_norm" || true

      if [[ "$local_sha2" == "$remote_sha2" ]]; then
        say "  OK: matches online (normalized) and repo truth: docs/public/${path}"
      else
        fail "${path} drift: repo docs/public/${path} != online (${url})"
        say "    repo_sha=${local_sha2}"
        say "    online_sha=${remote_sha2}"
      fi
    else
      # Not in repo => cannot be asserted.
      msg="${path} has NO source-of-truth in a2a-site (expected docs/public/${path} but missing). This is drift risk."
      if [[ "$HARD_FAIL_ON_MISSING_SOT" == "1" ]]; then
        fail "$msg"
      else
        warn "$msg"
      fi
      # Additionally: if older workspace has legacy copies, call it out as non-authoritative.
      if [[ -f "/home/ubuntu/.openclaw/workspace/public/${path}" ]]; then
        warn "legacy copy exists at /home/ubuntu/.openclaw/workspace/public/${path} (old/non-authoritative; do not treat as current)."
      fi
    fi
  else
    fail "fetch failed: ${url}"
  fi
  rm -f "$tmp" "${tmp}.headers" || true
  say ""
done

# 4) Optional public entries
for path in start /; do
  url="${BASE_URL}/${path}"
  tmp=$(mktemp)
  if fetch "$url" "$tmp"; then
    if has_nextjs_headers "${tmp}.headers"; then
      say "OK: ${url} appears served by Next.js"
    else
      warn "${url} does not look like Next.js (may be fine depending on deployment)"
    fi
  else
    warn "fetch failed (optional): ${url}"
  fi
  rm -f "$tmp" "${tmp}.headers" || true
  say ""
done

# Summary
if [[ "$PASS" == "true" ]]; then
  say "PASS: publication sources look consistent for required surfaces (with noted warnings if any)."
  exit 0
else
  say "FAIL: publication sources have drift / missing repo source-of-truth (see FAIL/WARN above)."
  exit 1
fi
