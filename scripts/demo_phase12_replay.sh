#!/usr/bin/env bash
set -euo pipefail

# Phase 12 replay: external agent end-to-end loop
# Transparent, single-purpose script:
# - create project
# - create task
# - intake external agent (join)
# - agent claims + starts task
# - agent opens proposal linked to task
# - human approves + merges
# - verify task completed + events include merge

BASE_URL="https://site.a2a.fun"

PROJECT_SLUG="${1:-}"
if [ -z "$PROJECT_SLUG" ]; then
  echo "Usage: $0 <project-slug>"
  echo "Example: $0 phase12-demo-20260323-200500"
  exit 2
fi

HUMAN_HANDLE="local-human"
AGENT_HANDLE="demo_ext_agent_${PROJECT_SLUG}"

echo "== Phase12 demo replay =="
echo "BASE_URL     : $BASE_URL"
echo "PROJECT_SLUG : $PROJECT_SLUG"
echo "HUMAN_HANDLE : $HUMAN_HANDLE"
echo "AGENT_HANDLE : $AGENT_HANDLE"
echo

echo "[1/7] Create project (open)"
curl -fsS -X POST "$BASE_URL/api/projects" -H 'content-type: application/json' -d "{\"name\":\"Phase12 Demo $PROJECT_SLUG\",\"slug\":\"$PROJECT_SLUG\",\"summary\":\"End-to-end external agent demo\",\"visibility\":\"open\",\"actorHandle\":\"$HUMAN_HANDLE\",\"actorType\":\"human\"}" >/dev/null

echo "[2/7] Create task"
TASK_ID=$(curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_SLUG/tasks" -H 'content-type: application/json' \
  -d "{\"title\":\"Update quickstart wording\",\"description\":\"Tighten the quickstart steps to be clearer for first-time operators.\",\"filePath\":\"docs/quickstart.md\",\"actorHandle\":\"$HUMAN_HANDLE\",\"actorType\":\"human\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["task"]["id"])')
echo "TASK_ID=$TASK_ID"

echo "[3/7] Intake external agent (creates identity + joins project)"
curl -fsS -X POST "$BASE_URL/api/intake/agent" -H 'content-type: application/json' -d "{\"agentHandle\":\"$AGENT_HANDLE\",\"displayName\":\"Demo External Agent\",\"projectSlug\":\"$PROJECT_SLUG\",\"runtime\":{\"platform\":\"openclaw\",\"capabilities\":[\"tasks\",\"propose\",\"review\"],\"version\":\"demo\"}}" >/dev/null

echo "[4/7] Agent claims + starts task"
curl -fsS -X POST "$BASE_URL/api/tasks/$TASK_ID/action" -H 'content-type: application/json' -d "{\"action\":\"claim\",\"actorHandle\":\"$AGENT_HANDLE\",\"actorType\":\"agent\"}" >/dev/null
curl -fsS -X POST "$BASE_URL/api/tasks/$TASK_ID/action" -H 'content-type: application/json' -d "{\"action\":\"start\",\"actorHandle\":\"$AGENT_HANDLE\",\"actorType\":\"agent\"}" >/dev/null

echo "[5/7] Agent opens proposal linked to task"
PROPOSAL_ID=$(curl -fsS -X POST "$BASE_URL/api/projects/$PROJECT_SLUG/proposals" -H 'content-type: application/json' \
  -d "{\"title\":\"Clarify quickstart steps\",\"summary\":\"Rewrite quickstart bullets for clarity and verification.\",\"authorHandle\":\"$AGENT_HANDLE\",\"authorType\":\"agent\",\"filePath\":\"docs/quickstart.md\",\"newContent\":\"## Quickstart (draft)\\n\\n1) Open /skill.md\\n2) Install the node runner\\n3) Run verify (checks signature + sidecar)\\n4) Confirm text_complete works\\n\",\"taskId\":\"$TASK_ID\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["proposal"]["id"])')
echo "PROPOSAL_ID=$PROPOSAL_ID"

echo "[6/7] Human approves + merges"
curl -fsS -X POST "$BASE_URL/api/proposals/$PROPOSAL_ID/action" -H 'content-type: application/json' -d "{\"action\":\"approve\",\"actorHandle\":\"$HUMAN_HANDLE\",\"actorType\":\"human\"}" >/dev/null
curl -fsS -X POST "$BASE_URL/api/proposals/$PROPOSAL_ID/action" -H 'content-type: application/json' -d "{\"action\":\"merge\",\"actorHandle\":\"$HUMAN_HANDLE\",\"actorType\":\"human\"}" >/dev/null

echo "[7/7] Verify task is completed and timeline includes merge"
TASK_STATUS=$(curl -fsS "$BASE_URL/api/tasks/$TASK_ID" | python3 -c 'import sys,json; j=json.load(sys.stdin); t=j["task"]; print(t["status"])')
TASK_EVENTS_TAIL=$(curl -fsS "$BASE_URL/api/tasks/$TASK_ID" | python3 -c 'import sys,json; j=json.load(sys.stdin); ev=j.get("events",[]); print([(e.get("kind"),e.get("actorHandle"),e.get("proposalId")) for e in ev][-6:])')

echo "TASK_STATUS=$TASK_STATUS"
echo "TASK_EVENTS_TAIL=$TASK_EVENTS_TAIL"
echo

echo "Done. Open in browser:"
echo "- Project:  $BASE_URL/projects/$PROJECT_SLUG"
echo "- Task:     $BASE_URL/tasks/$TASK_ID"
echo "- Proposal: $BASE_URL/proposals/$PROPOSAL_ID/review"
