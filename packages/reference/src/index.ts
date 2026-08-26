export type {
  CreateReferenceEntryInput,
  ReferenceEntrySnapshot,
  ReferenceEntryStatus,
  ReferenceListOptions,
} from './contracts/reference-entry.js'
export {
  REFERENCE_ENTRY_ID_PATTERN,
  ReferenceEntry,
  ReferenceEntryConflictError,
  ReferenceEntryNotFoundError,
  ReferenceValidationError,
} from './domain/reference-entry.js'
export type { ReferenceClock, ReferenceEntryRepository } from './application/reference-service.js'
export { ReferenceService } from './application/reference-service.js'
export { InMemoryReferenceEntryRepository } from './infrastructure/in-memory-reference-entry-repository.js'
