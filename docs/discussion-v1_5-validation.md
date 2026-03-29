# Discussion v1.5 Layer A Validation (minimal real-usage)

Scope (strict)
- Quote (quotedReplyId)
- Reactions (👍 👀 ❤️)
- Project-scoped discussion search
- Minimal moderation (lock/unlock thread, hide/unhide reply)

Not in scope
- Layer B items (cross-project feed, agent free post/mention)

---

## Validation environment
- Dev server used: local `next dev` on port `3007`.
- Seed project used: `/projects/disc-v1-test`.

---

## A) Quote validation

Steps executed (real run)
1) Create a thread
2) Create a reply by `bob`
3) Create a reply by `alice` with `quotedReplyId=<bobReplyId>`

Results
- ✅ API accepted `quotedReplyId` and returned it in reply object.
- ✅ Thread GET returned reply with `quotedReplyId`.
- ✅ UI thread page renders a quoted block with jump link to the original reply anchor.
- ✅ Quote produced **no new notification type** and **no timeline noise**.

Notes
- This is strictly better than copy/paste because the quote stays referential and jumpable.

---

## B) Reactions validation

Steps executed (real run)
1) Add `👍` reaction to thread
2) Add `👀` reaction to a reply
3) Fetch thread to confirm aggregated counts

Results
- ✅ Reaction endpoints return `{ok:true}`.
- ✅ `GET thread` returns aggregated counts:
  - `reactions.thread` includes `👍:1`
  - `reactions.replies[replyId]` includes `👀:1`
- ✅ Reactions do not create inbox notifications.
- ✅ Reactions do not create timeline entries.

Notes
- Current UI shows counts inline; no additional surfaces.

---

## C) Project-scoped search validation

Steps executed (real run)
1) Search `/api/projects/{slug}/discussions/search?q=quote`

Results
- ✅ Search returns thread-level result list.
- ✅ Matches include reply body content (via EXISTS on replies).
- ✅ Results contain thread ids and deep-linkable fields.

UI
- Project page discussions section includes a search input and renders results.

---

## D) Minimal moderation validation

Thread lock
- ✅ `POST /lock locked=true` succeeded.
- ✅ Reply attempt while locked fails with `thread_locked`.

Reply hide
- ✅ `POST /replies/{replyId}/hide hidden=true` succeeded.
- ✅ Thread GET shows the reply with `isHidden=true`.

Audit records
- ✅ Verified audit rows exist in SQLite `audit_events`:
  - `discussion.thread_lock`
  - `discussion.reply_hide`

Noise policy
- ✅ Moderation does not generate inbox notifications.
- ✅ Only governance-level thread lock/unlock emits timeline activity (intended).

---

## Summary conclusion

- v1.5 Layer A is functionally usable and aligns with the baseline boundaries:
  - quote/reactions/search do not pollute timeline/inbox
  - moderation is gated + audited
- No Layer B behaviors were enabled by this validation.
