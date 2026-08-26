# Approvals

Codex App Server is bidirectional and may request user/client approval.

The v6 sample adapter establishes the execution architecture but intentionally
does not auto-approve arbitrary privileged actions.

Production implementations should:
- explicitly handle server requests
- distinguish read/write/destructive actions
- persist approval decisions where appropriate
- never convert an approval request into implicit approval
