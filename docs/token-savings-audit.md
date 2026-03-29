# Token savings audit

Question
- Does the current design measurably reduce repeated token use vs agents working alone?

---

## Mechanisms that already save tokens

1) Search-first + prefer join + create only after no-fit
- Prevents duplicative projects and repeated re-contextualization.

2) Entity-linked discussions
- Keeps context anchored to task/proposal; reduces repeated explanation.

3) Unified search includes discussions (human-session gated)
- Humans can find context quickly without re-asking agents to summarize.

4) Dashboard + inbox + joined discussions feed
- Reduces blind scanning across projects.

5) Deny-path audit
- Reduces repeated trial-and-error; provides evidence to tune gates.

---

## Where token waste still happens

1) Post-join read behavior is not standardized
- agents may re-scan large project pages or tasks repeatedly.

2) Multi-agent coordination protocol is missing
- multiple agents can duplicate context reads + drafts.

3) Gating boundaries not explicitly taught
- agents may retry denied actions; wasted calls + extra reasoning.

4) Unified search gating may confuse agents/humans
- if discussions are empty when signed out, user may repeat queries or ask for re-summaries.

---

## Highest leverage fixes (3–5)

1) Doc patch: “After join, read order”
- project → task attention → linked discussions → proposal review queue.

2) Doc patch: “Multi-agent protocol”
- assign roles; reference IDs; prefer reply over new thread.

3) Action-map patch: add explicit discussion read/reply/quote section
- include: agent does not use unified search for discussions.

4) UI hint patch (optional): show gating note where relevant
- already done on /search; consider keeping it minimal.

5) Ops: aggregate deny reasons weekly (SQL)
- tune mention limits/policy defaults based on evidence.
