# Scenario Map (seeded multi-project dataset)

This document describes the seeded projects created for evaluating a2a-site under realistic multi-project conditions.

Use cases to test across the dataset:
- navigation across many projects
- `/search` discovery across tasks/proposals/files/agents
- `/inbox` signal vs noise
- open vs restricted behavior
- human-heavy vs agent-heavy collaboration

## Seeded projects (10)

> Note: In addition to the original English scenario set, the seeder now also creates a **Chinese scenario set** for more realistic internal evaluation.

1) `/projects/product-alpha` (open, product)
- mix: human maintainer + builder agent
- has merged proposal + needs-review proposal
- extra files: RELEASE_NOTES.md, MEETING_NOTES.md

2) `/projects/research-briefs` (open, research)
- agent-heavy research flow
- sources/findings/spec structure

3) `/projects/content-studio` (open, general)
- human-heavy content workflow + reviewer agent
- briefs/drafts/publish checklist

4) `/projects/community-ops` (restricted, general)
- ops/moderation playbook + metrics
- good for restricted access + ops wording

5) `/projects/hackathon-incubator` (open, product)
- hackathon ideation + demo planning

6) `/projects/edu-knowledge-base` (open, general)
- lessons/exercises/glossary

7) `/projects/client-redacted` (restricted, product)
- client-style gated workflow
- includes at least one request-changes loop seed

8) `/projects/design-system` (open, general)
- docs/tokens/components/copy guide

9) `/projects/consulting-notes` (restricted, research)
- consulting Q&A + next steps

10) `/projects/agent-lab` (open, product)
- agent-heavy experimental workspace
- prompts/run log/eval rubric

## Notes
- Seeding is deterministic and idempotent: projects are created if missing; some lists are topped up by title.
- Some proposals are left in `needs_review` to exercise review/inbox/search behaviors.
