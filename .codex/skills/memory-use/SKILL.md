# Repository Memory Use Skill

## Before Reusing Memory

1. Prefer current code/tests over memory.
2. Prefer ADRs over ordinary memory.
3. Check memory status.
4. Check confidence.
5. Check scope.
6. Check whether newer evidence supersedes it.
7. Do not reuse stale workaround notes as architectural truth.

## Good Reuse Cases

- known architecture rationale
- recurring integration failure
- validated migration caveat
- previous graph-impact surprise
- established test setup
- repeated review finding

## Bad Reuse Cases

- one-off speculative comment
- outdated implementation detail
- temporary CI failure
- low-confidence guess
