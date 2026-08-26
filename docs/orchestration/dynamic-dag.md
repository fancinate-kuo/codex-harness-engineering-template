# Dynamic DAG Compiler

v8 compiles a task-specific DAG from requirement + graph context.

Instead of always running:

Planner → Impact → Backend → Frontend → Database → Integration → Test → Review → PR

the compiler decides which nodes are actually required.

## Inputs

- task metadata
- requirement / feature
- Business Graph
- GitNexus impact context
- architecture rules
- risk metadata
- UI/API/database/security indicators

## Example Outputs

Backend-only:

Planner → Impact → Backend → Test → Review → PR

Full-stack:

Planner → Impact → Backend / Frontend / Migration → Integration
→ Playwright / Test / Security Review → Review → PR

Docs-only:

Planner → Docs → Review → PR

## Principle

The workflow is compiled from current task evidence.
The scheduler executes the compiled DAG.
