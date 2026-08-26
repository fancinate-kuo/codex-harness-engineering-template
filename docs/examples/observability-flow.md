# Observability Example

1. DAG compiled with 8 nodes.
2. Backend and Frontend run in parallel.
3. Test fails.
4. Feedback classifies test-regression.
5. Harness recompiles DAG and adds Fix.
6. Fix passes.
7. Review passes.
8. PR gate passes.

Metrics:
- retry_count = 0
- replan_count = 1
- self_correction_count = 1
- test_failure_count = 1
- dag_node_count = 9
