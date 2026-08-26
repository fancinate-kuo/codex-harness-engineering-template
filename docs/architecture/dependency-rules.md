# Dependency Rules

## Allowed

- api -> application
- application -> domain
- infrastructure -> application
- infrastructure -> domain
- web page -> web feature
- web feature -> shared

## Forbidden

- domain -> infrastructure
- domain -> api/web
- module A -> module B private database implementation
- feature A -> feature B private internals

## Enforcement

These rules should eventually be enforced with:
- ESLint import rules
- dependency-cruiser / Nx boundaries / custom rules
- architecture tests
- graph consistency checks
