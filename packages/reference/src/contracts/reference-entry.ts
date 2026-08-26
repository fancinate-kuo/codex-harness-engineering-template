export const REFERENCE_ENTRY_STATUSES = ['active', 'archived'] as const

export type ReferenceEntryStatus = (typeof REFERENCE_ENTRY_STATUSES)[number]

export interface CreateReferenceEntryInput {
  id?: string
  title: string
  body: string
  tags?: readonly string[]
}

export interface ReferenceEntrySnapshot {
  id: string
  title: string
  body: string
  tags: string[]
  status: ReferenceEntryStatus
  createdAt: string
  updatedAt: string
}

export interface ReferenceListOptions {
  includeArchived?: boolean
}
