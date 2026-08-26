# Codex Adapter Configuration

Config file:

`.codex/orchestration/codex.json`

Key options:
- binary
- adapter
- model
- approval policy
- sandbox policy
- timeout
- stage prompt mode

The App Server adapter is the default.

If App Server is unavailable, use the file-request adapter.
The runner should never silently downgrade execution mode.
