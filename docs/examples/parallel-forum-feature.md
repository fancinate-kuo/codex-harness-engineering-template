# Parallel Example

Requirement: moderators can pin posts with UI feedback and persistence.

After Planner + Impact:
- Backend agent: endpoint, authorization, application logic
- Frontend agent: action/state/UI
- Database agent: migration only if required

Integration joins branches.
Test and Review then run in parallel.
PR waits for both.
