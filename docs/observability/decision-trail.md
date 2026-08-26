# Decision Trail

Every important orchestration decision should be auditable.

Examples:
- why a DAG node was added
- why a failure was classified as architecture/security/transient
- why a task was blocked
- why a retry was allowed
- why a replan occurred
- why a privileged approval was requested
- why PR gate passed or failed

Decision logs should point to evidence, not hidden reasoning.
