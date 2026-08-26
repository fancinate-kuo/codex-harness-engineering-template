# Live Vue Dashboard

v15 adds a Vue 3 dashboard and Server-Sent Events.

## Development

Terminal 1:

```bash
pnpm harness:control:serve
```

Terminal 2:

```bash
pnpm control:dev
```

Open:

`http://127.0.0.1:4318`

## Live Events

The API exposes:

`GET /events`

Event types:
- connected
- snapshot
- task
- approval
- feedback
- metrics

The dashboard refreshes task/DAG state when events arrive.
