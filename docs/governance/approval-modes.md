# Approval Modes

## auto
Task may proceed autonomously if normal gates pass.

## auto-with-gates
No explicit human approval is required, but architecture/tests/review/PR gates remain mandatory.

## approval-required
Execution may plan and analyze, but sensitive mutation or PR progression must wait for approval.

## manual-only
Harness may prepare context and recommendations, but must not autonomously perform the protected action.
