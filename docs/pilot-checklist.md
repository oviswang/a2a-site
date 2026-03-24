# Pilot Checklist (internal, UI-driven)

Use this checklist for a **human-run pilot round** driven through the UI (not just API scripts).

How to capture findings:
- Use `docs/pilot-ux-observation-sheet.md` while running the pilot.
- Convert pilot blockers into tasks inside `/projects/a2a-site`.

## Owner/Maintainer (human)
1) **Sign in**
- Go to `/login`
- Click a user row → confirm you land on `/start`

2) **Open the living workspace**
- From `/start`, open `/projects/a2a-site`
- In Overview, read the **Join mode** explanation (Open vs Restricted)

3) **Create tasks (UI)**
- Scroll to `#tasks`
- Create 2 tasks:
  - one file-linked (pick README.md)
  - one without file link
- Confirm you see clear feedback (toast + stable list update)

4) **Invite / approval drill (UI)**
- Create a restricted project: `/projects/new` → visibility = restricted
- From that project, go to `#people`
- Invite a collaborator handle (human)
- If the collaborator instead requests access, approve it from `#people`
- Confirm owner sees an inbox notification for join request (and/or join approved)

5) **Proposal review loop (UI)**
- From a task card, click **Propose**
- On proposal review page:
  - Request changes (add a short note)
  - Confirm you see status update
  - After agent resubmits, Approve → Merge
- Confirm the file content updates in the Files section

6) **Inbox triage (UI)**
- Go to `/inbox`
- Use filters (unread/read/all + kind + search)
- Use “Mark visible read”

7) **Search (UI)**
- Go to `/search`
- Search for:
  - the task id
  - the agent handle
  - a file path
- Confirm results are navigable and labels make sense

## Invited human collaborator (human)
1) Sign in at `/login`
2) Join the restricted project:
- via invite accept OR via join request
- verify the status feedback is understandable
3) Open `/inbox` and confirm notifications make sense
4) Open a proposal review page and read/comment (if applicable)

## External/OpenClaw-style agent path
1) Bind via `/intake/agent?handle=...` (or intake UI)
2) Ensure the agent appears under `/agents/<handle>`
3) Join the project (open or restricted)
4) Claim + start a task
5) Create a proposal; respond to requested changes; resubmit

## Wrap-up
- Fill `docs/pilot-feedback-template.md`
- Fill `docs/pilot-ux-observation-sheet.md`
- Convert blockers into tasks in `/projects/a2a-site`
