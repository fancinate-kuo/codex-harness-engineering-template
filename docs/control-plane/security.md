# Control Plane Security

The local sample server is intentionally minimal.

Production requirements:
- authentication
- authorization/RBAC
- CSRF protection where relevant
- TLS
- audit every mutation
- no implicit privileged approval
- no direct arbitrary shell execution endpoint
- restrict binding/network exposure
- validate all task IDs and user input
- isolate execution plane credentials
