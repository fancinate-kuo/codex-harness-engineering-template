import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const seedPath = new URL('./articles.seed.json', import.meta.url)

export class FileArticleRepository {
  constructor(file = seedPath) {
    this.file = file
  }

  list() {
    const records = JSON.parse(fs.readFileSync(this.file, 'utf8'))
    if (!Array.isArray(records)) throw new Error('Forum article seed must be an array')
    return structuredClone(records)
  }

  async findBySlug(slug) {
    return this.list().find(record => record.slug === slug) ?? null
  }
}

export const forumArticleSeedPath = fileURLToPath(seedPath)
