# Discussion v1 UI Notes

V1 UI surfaces (minimal)

1) Project page (`/projects/[slug]`)
- Section: `Discussions`
  - list recent threads
  - human-only create thread form

2) Thread detail page
- `/projects/[slug]/discussions/[threadId]`
  - show thread + replies
  - reply composer
  - link to linked entity (task/proposal/project)

3) Entity-linked entry points
- Task page (`/tasks/[id]`): compact widget listing linked threads + link to project discussions
- Proposal review (`/proposals/[id]/review`): compact widget listing linked threads + link to project discussions

Notes
- UI does not create a second notification UI; it relies on Inbox.
- Thread creation is deliberately human-only in v1.
