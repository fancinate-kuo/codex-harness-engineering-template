import type {
  CreateReferenceEntryInput,
  ReferenceEntrySnapshot,
  ReferenceEntryStatus,
} from '../contracts/reference-entry.js'

export const REFERENCE_ENTRY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/
const MAX_TITLE_LENGTH = 200
const MAX_BODY_LENGTH = 20_000

export class ReferenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReferenceValidationError'
  }
}

export class ReferenceEntryConflictError extends Error {
  constructor(id: string) {
    super(`Reference entry already exists: ${id}`)
    this.name = 'ReferenceEntryConflictError'
  }
}

export class ReferenceEntryNotFoundError extends Error {
  constructor(id: string) {
    super(`Reference entry not found: ${id}`)
    this.name = 'ReferenceEntryNotFoundError'
  }
}

function requireId(id: string) {
  if (!REFERENCE_ENTRY_ID_PATTERN.test(id)) {
    throw new ReferenceValidationError(
      'Reference entry id must match [A-Za-z0-9][A-Za-z0-9._:-]{0,63}',
    )
  }
  return id
}

function requireText(value: string, field: 'title' | 'body', maxLength: number) {
  const normalized = value.trim()
  if (!normalized) throw new ReferenceValidationError(`${field} is required`)
  if (normalized.length > maxLength) {
    throw new ReferenceValidationError(`${field} must be at most ${maxLength} characters`)
  }
  return normalized
}

function normalizeTags(tags: readonly string[] = []) {
  const normalized = new Set<string>()
  for (const tag of tags) {
    const value = tag.trim().toLowerCase()
    if (!value) continue
    if (value.length > 64) throw new ReferenceValidationError('tags must be at most 64 characters')
    normalized.add(value)
  }
  return [...normalized]
}

function isoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new ReferenceValidationError('timestamp is invalid')
  return date.toISOString()
}

function requireStatus(status: ReferenceEntryStatus) {
  if (status !== 'active' && status !== 'archived') {
    throw new ReferenceValidationError(`Unsupported reference entry status: ${status}`)
  }
  return status
}

export class ReferenceEntry {
  private constructor(private snapshot: ReferenceEntrySnapshot) {}

  static create(input: CreateReferenceEntryInput & { id: string }, now: Date) {
    const timestamp = isoDate(now)
    return new ReferenceEntry({
      id: requireId(input.id),
      title: requireText(input.title, 'title', MAX_TITLE_LENGTH),
      body: requireText(input.body, 'body', MAX_BODY_LENGTH),
      tags: normalizeTags(input.tags),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  static fromSnapshot(snapshot: ReferenceEntrySnapshot) {
    const entry = new ReferenceEntry({
      id: requireId(snapshot.id),
      title: requireText(snapshot.title, 'title', MAX_TITLE_LENGTH),
      body: requireText(snapshot.body, 'body', MAX_BODY_LENGTH),
      tags: normalizeTags(snapshot.tags),
      status: requireStatus(snapshot.status),
      createdAt: isoDate(snapshot.createdAt),
      updatedAt: isoDate(snapshot.updatedAt),
    })
    return entry
  }

  archive(now: Date) {
    if (this.snapshot.status === 'active') {
      this.snapshot = { ...this.snapshot, status: 'archived', updatedAt: isoDate(now) }
    }
    return this
  }

  toSnapshot(): ReferenceEntrySnapshot {
    return { ...this.snapshot, tags: [...this.snapshot.tags] }
  }
}
