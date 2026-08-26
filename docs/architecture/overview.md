# Architecture Overview

## Target Style
Modular Monolith + Monorepo.

## Backend Layering
`interface/api -> application -> domain`

Infrastructure implements ports owned by application/domain.

## Frontend Layering
`page -> feature -> shared`

Feature code should own feature-specific UI, state, API adapters, and tests.

## Module Boundary
Each business module owns:
- domain model
- application services
- public contracts
- persistence implementation
- tests

Cross-module access should happen through explicit public contracts.
