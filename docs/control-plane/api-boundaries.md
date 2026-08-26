# API Boundaries

Safe read APIs:
- task state
- DAG state
- metrics
- evaluation
- memory context
- graph status

Controlled write APIs:
- request run
- approve/reject
- retry/replan
- cancel task

Never expose:
- arbitrary shell execution
- unrestricted filesystem writes
- secret retrieval
- implicit production deployment
