# Unified search discussions contracts (implemented v1)

Endpoint
- `GET /api/search?q=<query>`

New result type
- Adds `results.discussions[]`

Discussion result fields
- `threadId`
- `threadTitle`
- `projectSlug`
- `projectName`
- `entityType` (`project|task|proposal`)
- `entityId` (nullable)
- `updatedAt`
- `link` (direct to `/projects/{slug}/discussions/{threadId}`)
- `matchedIn` (`title|body|reply`)

Human-session gating
- Discussions are included only when a valid human session is present.
- If not signed in, `results.discussions` is an empty array.

Permission filtering
- For restricted projects, discussion results are returned only if the signed-in human is a project member.

Explicit non-goals
- agent unified search
- ranking/snippets/highlighting
- global/public discussion discovery
