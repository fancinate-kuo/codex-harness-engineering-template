import { randomUUID } from 'node:crypto'
import type {
  CreateReferenceEntryInput,
  ReferenceEntrySnapshot,
  ReferenceListOptions,
} from '../contracts/reference-entry.js'
import {
  ReferenceEntry,
  ReferenceEntryConflictError,
  ReferenceEntryNotFoundError,
  ReferenceValidationError,
  REFERENCE_ENTRY_ID_PATTERN,
} from '../domain/reference-entry.js'

export interface ReferenceEntryRepository {
  findById(id: string): Promise<ReferenceEntrySnapshot | null>
  list(): Promise<ReferenceEntrySnapshot[]>
  save(entry: ReferenceEntrySnapshot): Promise<void>
}

export type ReferenceClock = () => Date

export class ReferenceService {
  constructor(
    private readonly repository: ReferenceEntryRepository,
    private readonly clock: ReferenceClock = () => new Date(),
  ) {}

  async create(input: CreateReferenceEntryInput): Promise<ReferenceEntrySnapshot> {
    const id = input.id ?? randomUUID()
    const existing = await this.repository.findById(id)
    if (existing) throw new ReferenceEntryConflictError(id)

    const entry = ReferenceEntry.create({ ...input, id }, this.clock())
    await this.repository.save(entry.toSnapshot())
    return entry.toSnapshot()
  }

  async get(id: string): Promise<ReferenceEntrySnapshot | null> {
    this.validateId(id)
    const snapshot = await this.repository.findById(id)
    return snapshot ? ReferenceEntry.fromSnapshot(snapshot).toSnapshot() : null
  }

  async list(options: ReferenceListOptions = {}): Promise<ReferenceEntrySnapshot[]> {
    const entries = (await this.repository.list()).map((snapshot) =>
      ReferenceEntry.fromSnapshot(snapshot).toSnapshot(),
    )
    return entries
      .filter((entry) => options.includeArchived || entry.status === 'active')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async archive(id: string): Promise<ReferenceEntrySnapshot> {
    this.validateId(id)
    const snapshot = await this.repository.findById(id)
    if (!snapshot) throw new ReferenceEntryNotFoundError(id)

    const entry = ReferenceEntry.fromSnapshot(snapshot).archive(this.clock())
    await this.repository.save(entry.toSnapshot())
    return entry.toSnapshot()
  }

  private validateId(id: string) {
    if (!REFERENCE_ENTRY_ID_PATTERN.test(id)) {
      throw new ReferenceValidationError('Reference entry id is invalid')
    }
  }
}
