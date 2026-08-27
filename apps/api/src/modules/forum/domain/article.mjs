export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_ARTICLE_QUERY_LENGTH = 100

export const CATEGORY_DEFINITIONS = Object.freeze([
  { key: 'technology', label: '科技', glyph: '⌘', color: '#5b79ff' },
  { key: 'design', label: '設計', glyph: '◒', color: '#dd7e55' },
  { key: 'life', label: '生活', glyph: '◌', color: '#6caa8a' },
  { key: 'photo', label: '攝影', glyph: '▧', color: '#aa83da' },
  { key: 'developer', label: '開發者', glyph: '</>', color: '#e5a446' },
])

const CATEGORY_KEYS = new Set(CATEGORY_DEFINITIONS.map(category => category.key))

export class ArticleValidationError extends Error {
  constructor(message, code = 'INVALID_ARTICLE') {
    super(message)
    this.name = 'ArticleValidationError'
    this.code = code
  }
}

function requireText(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new ArticleValidationError(`${field} must be text`)
  }
  const normalized = value.trim()
  if (!normalized) throw new ArticleValidationError(`${field} is required`)
  if (normalized.length > maxLength) {
    throw new ArticleValidationError(`${field} must be at most ${maxLength} characters`)
  }
  return normalized
}

export function validateArticleRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new ArticleValidationError('article record is invalid')
  }
  if (!ARTICLE_SLUG_PATTERN.test(record.slug ?? '')) {
    throw new ArticleValidationError('slug is invalid')
  }
  if (!CATEGORY_KEYS.has(record.categoryKey)) {
    throw new ArticleValidationError(`Unsupported article category: ${record.categoryKey}`)
  }
  if (!['published', 'draft'].includes(record.status)) {
    throw new ArticleValidationError('status is invalid')
  }
  const publishedAt = new Date(record.publishedAt)
  if (Number.isNaN(publishedAt.getTime())) {
    throw new ArticleValidationError('publishedAt must be a valid timestamp')
  }
  if (!Array.isArray(record.content) || record.content.length === 0) {
    throw new ArticleValidationError('content is required')
  }

  return {
    ...structuredClone(record),
    title: requireText(record.title, 'title', 200),
    excerpt: requireText(record.excerpt, 'excerpt', 500),
    pullQuote: requireText(record.pullQuote, 'pullQuote', 300),
    content: record.content.map(paragraph => requireText(paragraph, 'content', 5000)),
    author: {
      ...record.author,
      name: requireText(record.author?.name, 'author.name', 100),
      initials: requireText(record.author?.initials, 'author.initials', 8),
      bio: requireText(record.author?.bio, 'author.bio', 300),
    },
    category: CATEGORY_DEFINITIONS.find(category => category.key === record.categoryKey),
    publishedAt: publishedAt.toISOString(),
  }
}

export function normalizeArticleQuery({ category = 'all', q = '' } = {}) {
  if (category !== 'all' && !CATEGORY_KEYS.has(category)) {
    throw new ArticleValidationError(`Unsupported article category: ${category}`, 'INVALID_FORUM_QUERY')
  }
  if (typeof q !== 'string') {
    throw new ArticleValidationError('q must be text', 'INVALID_FORUM_QUERY')
  }
  const text = q.trim()
  if (text.length > MAX_ARTICLE_QUERY_LENGTH) {
    throw new ArticleValidationError(
      `q must be at most ${MAX_ARTICLE_QUERY_LENGTH} characters`,
      'INVALID_FORUM_QUERY',
    )
  }
  return { category, q: text.toLocaleLowerCase('zh-Hant') }
}

export function articleMatches(record, query) {
  if (query.category !== 'all' && record.categoryKey !== query.category) return false
  if (!query.q) return true
  return [record.title, record.excerpt, record.category.label, record.author.name]
    .some(value => value.toLocaleLowerCase('zh-Hant').includes(query.q))
}

export function toArticleSummary(record) {
  const { content: _content, pullQuote: _pullQuote, status: _status, ...rest } = record
  return {
    slug: rest.slug,
    category: { key: rest.category.key, label: rest.category.label },
    title: rest.title,
    excerpt: rest.excerpt,
    author: rest.author,
    publishedAt: rest.publishedAt,
    readCount: rest.readCount,
    replyCount: rest.replyCount,
    readDurationMinutes: rest.readDurationMinutes,
    colorClass: rest.colorClass,
    featured: rest.featured,
    trendingRank: rest.trendingRank ?? null,
  }
}

export function sortArticles(records) {
  return [...records].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
}
