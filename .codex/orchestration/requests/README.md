# Agent Invocation Requests

The runner writes one JSON request per stage here.

Example:

`TASK-FORUM-002__planner.json`

An external Codex/agent process should:
1. read the request,
2. follow the referenced agent instructions,
3. write the expected artifact under the task shared workspace,
4. optionally update `result.json`.

This is intentionally decoupled from one specific agent transport.
