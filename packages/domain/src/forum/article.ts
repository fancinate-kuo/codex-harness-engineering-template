import type {
  ArticleCategoryKey,
  ArticleDetail,
  ArticleListQuery,
  ArticleSummary,
} from '@harness/contracts'
import {
  ARTICLE_CATEGORY_KEYS,
  FORUM_CATEGORY_DEFINITIONS,
} from '@harness/contracts'

export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_ARTICLE_QUERY_LENGTH = 100

export type ArticleStatus = 'published' | 'draft'

export interface ArticleRecord extends ArticleDetail {
  status: ArticleStatus
}

export class ArticleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArticleValidationError'
  }
}

function requireText(value: string, field: string, maxLength: number) {
  const normalized = value.trim()
  if (!normalized) throw new ArticleValidationError(`${field} is required`)
  if (normalized.length > maxLength) {
    throw new ArticleValidationError(`${field} must be at most ${maxLength} characters`)
  }
  return normalized
}

function requireTimestamp(value: string) {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new ArticleValidationError('publishedAt must be a valid timestamp')
  }
  return timestamp.toISOString()
}

function requireCategory(value: ArticleCategoryKey) {
  if (!ARTICLE_CATEGORY_KEYS.includes(value)) {
    throw new ArticleValidationError(`Unsupported article category: ${value}`)
  }
  return value
}

export function normalizeArticleQuery(query: ArticleListQuery = {}) {
  const category = query.category ?? 'all'
  if (category !== 'all') requireCategory(category)

  const text = query.q?.trim() ?? ''
  if (text.length > MAX_ARTICLE_QUERY_LENGTH) {
    throw new ArticleValidationError(
      `q must be at most ${MAX_ARTICLE_QUERY_LENGTH} characters`,
    )
  }

  return { category, q: text.toLocaleLowerCase('zh-Hant') }
}

export class Article {
  private constructor(private readonly snapshot: ArticleRecord) {}

  static fromRecord(record: ArticleRecord) {
    if (!ARTICLE_SLUG_PATTERN.test(record.slug)) {
      throw new ArticleValidationError('slug is invalid')
    }
    const categoryKey = requireCategory(record.category.key)
    const category = FORUM_CATEGORY_DEFINITIONS.find(item => item.key === categoryKey)
    if (!category) throw new ArticleValidationError('category is invalid')

    const content = record.content.map(paragraph => requireText(paragraph, 'content', 5000))
    if (content.length === 0) throw new ArticleValidationError('content is required')

    return new Article({
      ...record,
      category: { key: category.key, label: category.label },
      title: requireText(record.title, 'title', 200),
      excerpt: requireText(record.excerpt, 'excerpt', 500),
      pullQuote: requireText(record.pullQuote, 'pullQuote', 300),
      author: {
        ...record.author,
        name: requireText(record.author.name, 'author.name', 100),
        initials: requireText(record.author.initials, 'author.initials', 8),
        bio: requireText(record.author.bio, 'author.bio', 300),
      },
      publishedAt: requireTimestamp(record.publishedAt),
      content,
      status: record.status === 'published' || record.status === 'draft'
        ? record.status
        : (() => { throw new ArticleValidationError('status is invalid') })(),
    })
  }

  isPublished() {
    return this.snapshot.status === 'published'
  }

  matches(query: ReturnType<typeof normalizeArticleQuery>) {
    if (query.category !== 'all' && this.snapshot.category.key !== query.category) {
      return false
    }
    if (!query.q) return true

    return [
      this.snapshot.title,
      this.snapshot.excerpt,
      this.snapshot.category.label,
      this.snapshot.author.name,
    ].some(value => value.toLocaleLowerCase('zh-Hant').includes(query.q))
  }

  toSummary(): ArticleSummary {
    const { content: _content, pullQuote: _pullQuote, status: _status, ...summary } = this.snapshot
    return structuredClone(summary)
  }

  toDetail(): ArticleDetail {
    return structuredClone(this.snapshot)
  }
}

export function sortArticles(articles: readonly Article[]) {
  return [...articles].sort((left, right) =>
    right.toDetail().publishedAt.localeCompare(left.toDetail().publishedAt),
  )
}
