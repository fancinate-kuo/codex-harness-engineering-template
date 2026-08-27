import { describe, expect, it } from 'vitest'
import {
  Article,
  ArticleValidationError,
  normalizeArticleQuery,
  sortArticles,
} from '../../packages/domain/src/forum/index.js'
import type { ArticleRecord } from '../../packages/domain/src/forum/index.js'

function record(overrides: Partial<ArticleRecord> = {}): ArticleRecord {
  return {
    slug: 'quiet-technology',
    status: 'published',
    category: { key: 'technology', label: '科技' },
    title: '當科技變得安靜，我們終於聽見自己',
    excerpt: '真正好的科技，讓我們把注意力放回重要的地方。',
    author: { name: '陳以安', initials: 'EA', tone: 'tone-sky', bio: '寫關於科技與人的距離。' },
    publishedAt: '2026-08-27T01:00:00.000Z',
    readCount: 2400,
    replyCount: 84,
    readDurationMinutes: 8,
    colorClass: 'sky',
    featured: true,
    trendingRank: null,
    pullQuote: '科技的終點，也許不是更多，而是剛剛好。',
    content: ['第一段內容。'],
    ...overrides,
  }
}

describe('Sora article domain', () => {
  it('normalizes valid queries and rejects unsupported categories or oversized search text', () => {
    expect(normalizeArticleQuery({ category: 'design', q: '  留白  ' })).toEqual({
      category: 'design',
      q: '留白',
    })
    expect(() => normalizeArticleQuery({ category: 'unknown' as never })).toThrow(ArticleValidationError)
    expect(() => normalizeArticleQuery({ q: 'x'.repeat(101) })).toThrow(ArticleValidationError)
  })

  it('validates article records and exposes a summary without full content', () => {
    const article = Article.fromRecord(record())
    expect(article.isPublished()).toBe(true)
    expect(article.toSummary()).toMatchObject({
      slug: 'quiet-technology',
      title: '當科技變得安靜，我們終於聽見自己',
    })
    expect(article.toSummary()).not.toHaveProperty('content')
    expect(() => Article.fromRecord(record({ slug: 'not valid' }))).toThrow(ArticleValidationError)
  })

  it('sorts articles by newest publication timestamp', () => {
    const older = Article.fromRecord(record({ slug: 'older', publishedAt: '2026-08-26T01:00:00.000Z' }))
    const newer = Article.fromRecord(record({ slug: 'newer', publishedAt: '2026-08-27T02:00:00.000Z' }))
    expect(sortArticles([older, newer]).map(article => article.toDetail().slug)).toEqual(['newer', 'older'])
  })
})
