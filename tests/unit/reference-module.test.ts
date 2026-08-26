import { describe, expect, it } from 'vitest'
import {
  InMemoryReferenceEntryRepository,
  ReferenceService,
  ReferenceValidationError,
  ReferenceEntryConflictError,
} from '../../packages/reference/src/index'

function createService() {
  let now = new Date('2026-08-26T10:30:00.000Z')
  const clock = () => now
  const repository = new InMemoryReferenceEntryRepository()

  return {
    repository,
    service: new ReferenceService(repository, clock),
    advanceTo(value: string) {
      now = new Date(value)
    },
  }
}

describe('generic reference module', () => {
  it('creates and lists reference entries through the public service seam', async () => {
    const { service } = createService()

    const created = await service.create({
      id: 'architecture-guide',
      title: 'Architecture guide',
      body: 'Keep domain logic independent from infrastructure.',
      tags: ['Architecture', 'architecture', 'design'],
    })

    expect(created).toEqual({
      id: 'architecture-guide',
      title: 'Architecture guide',
      body: 'Keep domain logic independent from infrastructure.',
      tags: ['architecture', 'design'],
      status: 'active',
      createdAt: '2026-08-26T10:30:00.000Z',
      updatedAt: '2026-08-26T10:30:00.000Z',
    })
    await expect(service.get('architecture-guide')).resolves.toEqual(created)
    await expect(service.list()).resolves.toEqual([created])
  })

  it('rejects duplicate identifiers and invalid input', async () => {
    const { service } = createService()
    const input = { id: 'same-entry', title: 'One', body: 'Content' }

    await service.create(input)
    await expect(service.create(input)).rejects.toBeInstanceOf(ReferenceEntryConflictError)
    await expect(service.create({ id: 'bad id', title: 'Title', body: 'Body' }))
      .rejects.toBeInstanceOf(ReferenceValidationError)
    await expect(service.create({ id: 'valid', title: ' ', body: 'Body' }))
      .rejects.toBeInstanceOf(ReferenceValidationError)
  })

  it('archives an entry idempotently and excludes it from the active list', async () => {
    const { service, advanceTo } = createService()
    const created = await service.create({
      id: 'retention-policy',
      title: 'Retention policy',
      body: 'Expired records are not active.',
    })

    advanceTo('2026-08-26T10:31:00.000Z')
    const archived = await service.archive(created.id)

    expect(archived.status).toBe('archived')
    expect(archived.updatedAt).toBe('2026-08-26T10:31:00.000Z')
    await expect(service.archive(created.id)).resolves.toEqual(archived)
    await expect(service.list()).resolves.toEqual([])
    await expect(service.list({ includeArchived: true })).resolves.toEqual([archived])
  })
})
