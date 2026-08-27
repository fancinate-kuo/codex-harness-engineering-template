import {
  CATEGORY_DEFINITIONS,
  ArticleValidationError,
  articleMatches,
  normalizeArticleQuery,
  sortArticles,
  toArticleSummary,
  validateArticleRecord,
} from '../domain/article.mjs'

export class ForumArticleService {
  constructor(repository) {
    this.repository = repository
  }

  async list(query = {}) {
    const normalizedQuery = normalizeArticleQuery(query)
    const records = (await this.repository.list()).map(validateArticleRecord)
    const published = sortArticles(records.filter(record => record.status === 'published'))
    const articles = published.filter(record => articleMatches(record, normalizedQuery))
    const featured = published.find(record => record.featured)
    const trendingSlugs = [...published]
      .filter(record => Number.isInteger(record.trendingRank))
      .sort((left, right) => left.trendingRank - right.trendingRank)
      .map(record => record.slug)

    return {
      categories: [
        {
          key: 'all',
          label: '全部文章',
          count: published.length,
          glyph: '✦',
          color: '#171717',
        },
        ...CATEGORY_DEFINITIONS.map(category => ({
          ...category,
          count: published.filter(record => record.categoryKey === category.key).length,
        })),
      ],
      articles: articles.map(toArticleSummary),
      total: articles.length,
      featuredSlug: featured?.slug ?? null,
      trendingSlugs,
    }
  }

  async get(slug) {
    const record = await this.repository.findBySlug(slug)
    if (!record) return null
    const article = validateArticleRecord(record)
    if (article.status !== 'published') return null
    return article
  }
}

export function createForumArticleService(repository) {
  if (!repository || typeof repository.list !== 'function' || typeof repository.findBySlug !== 'function') {
    throw new ArticleValidationError('Forum article repository is invalid')
  }
  return new ForumArticleService(repository)
}
