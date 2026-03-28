## Coverage map (updated snapshot)

Legend: Evidence(E) Gate(G) Workflow(W) RequiredReg(R) ReleaseCritical(C)

### cost
- single: short: ---Y- | medium: ---Y- | long: ---Y-
- multi_parent: short: YYYY- | medium: ---Y- | long: ---Y-
- same_role: short: ---Y- | medium: ---Y- | long: ---Y-
- multi_parent+same_role: short: ---Y- | medium: ---Y- | long: ---Y-

### coordination
- single: short: ---Y- | medium: ---Y- | long: ---Y-
- multi_parent: short: ---Y- | medium: ---Y- | long: ---Y-
- same_role: short: ---Y- | medium: ---Y- | long: ---Y-
- multi_parent+same_role: short: ---Y- | medium: ---Y- | long: ---Y-

### health
- single: short: ---YY | medium: ---YY | long: ---YY
- multi_parent: short: ---YY | medium: ---YY | long: ---YY
- same_role: short: ---YY | medium: ---YY | long: ---YY
- multi_parent+same_role: short: ---YY | medium: ---YY | long: YYYYY

### human_boundary
- single: short: ---YY | medium: ---YY | long: ---YY
- multi_parent: short: ---YY | medium: ---YY | long: ---YY
- same_role: short: ---YY | medium: ---YY | long: ---YY
- multi_parent+same_role: short: ---YY | medium: ---YY | long: YYYYY

### selection
- single: short: ----- | medium: ----- | long: -----
- multi_parent: short: ----Y | medium: ----Y | long: ----Y
- same_role: short: ----- | medium: ----- | long: -----
- multi_parent+same_role: short: ----Y | medium: ----Y | long: ----Y

### edge_unclassified
- single: short: YYYY- | medium: YYYY- | long: YYYY-
- multi_parent: short: YYYY- | medium: YYYY- | long: YYYY-
- same_role: short: YYYY- | medium: ---Y- | long: YYYY-
- multi_parent+same_role: short: ---Y- | medium: ---Y- | long: YYYY-

## Release-critical gaps (no evidence yet)
- health / single / short
- health / single / medium
- health / single / long
- health / multi_parent / short
- health / multi_parent / medium
- health / multi_parent / long
- health / same_role / short
- health / same_role / medium
- health / same_role / long
- health / multi_parent+same_role / short
- health / multi_parent+same_role / medium
- human_boundary / single / short
- human_boundary / single / medium
- human_boundary / single / long
- human_boundary / multi_parent / short
- human_boundary / multi_parent / medium
- human_boundary / multi_parent / long
- human_boundary / same_role / short
- human_boundary / same_role / medium
- human_boundary / same_role / long
- human_boundary / multi_parent+same_role / short
- human_boundary / multi_parent+same_role / medium
- selection / multi_parent / short
- selection / multi_parent / medium
- selection / multi_parent / long
- selection / multi_parent+same_role / short
- selection / multi_parent+same_role / medium
- selection / multi_parent+same_role / long

## Notes
- selection coverage is currently largely missing (no explicit selection gate reasons/cases yet).
- P13-1 completion makes gaps more important because missing required runs can now be proven/blocked.
