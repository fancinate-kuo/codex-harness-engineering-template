import type { ReferenceEntrySnapshot } from '../contracts/reference-entry.js'
import { ReferenceEntryConflictError } from '../domain/reference-entry.js'
import type { ReferenceEntryRepository } from '../application/reference-service.js'

export class InMemoryReferenceEntryRepository implements ReferenceEntryRepository {
  private readonly entries = new Map<string, ReferenceEntrySnapshot>()

  async findById(id: string) {
    const entry = this.entries.get(id)
    return entry ? { ...entry, tags: [...entry.tags] } : null
  }

  async list() {
    return [...this.entries.values()].map((entry) => ({ ...entry, tags: [...entry.tags] }))
  }

  async save(entry: ReferenceEntrySnapshot) {
    if (this.entries.has(entry.id)) {
      const current = this.entries.get(entry.id)
      if (current?.status === 'active' && entry.status === 'active') {
        throw new ReferenceEntryConflictError(entry.id)
      }
    }
    this.entries.set(entry.id, { ...entry, tags: [...entry.tags] })
  }
}
