# Self-Correction Guardrails

Self-correction must not become uncontrolled scope expansion.

Rules:
- feedback must come from recorded evidence
- every new DAG node must be policy-backed
- retry and replan are different actions
- unknown failures block rather than guess
- security/architecture failures cannot be auto-dismissed
- recompiled DAG must pass normal DAG validation
- PR gate remains downstream of final review
