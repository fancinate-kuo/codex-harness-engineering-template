export const ARTICLE_CATEGORY_KEYS = [
  'technology',
  'design',
  'life',
  'photo',
  'developer',
] as const

export type ArticleCategoryKey = (typeof ARTICLE_CATEGORY_KEYS)[number]

export const FORUM_CATEGORY_DEFINITIONS = [
  { key: 'technology', label: '科技', glyph: '⌘', color: '#5b79ff' },
  { key: 'design', label: '設計', glyph: '◒', color: '#dd7e55' },
  { key: 'life', label: '生活', glyph: '◌', color: '#6caa8a' },
  { key: 'photo', label: '攝影', glyph: '▧', color: '#aa83da' },
  { key: 'developer', label: '開發者', glyph: '</>', color: '#e5a446' },
] as const satisfies readonly {
  key: ArticleCategoryKey
  label: string
  glyph: string
  color: string
}[]

export interface ArticleCategory {
  key: ArticleCategoryKey
  label: string
}

export interface ArticleAuthor {
  name: string
  initials: string
  tone: string
  bio: string
}

export interface ArticleSummary {
  slug: string
  category: ArticleCategory
  title: string
  excerpt: string
  author: ArticleAuthor
  publishedAt: string
  readCount: number
  replyCount: number
  readDurationMinutes: number
  colorClass: string
  featured: boolean
  trendingRank: number | null
}

export interface ArticleDetail extends ArticleSummary {
  pullQuote: string
  content: string[]
}

export interface CategorySummary {
  key: ArticleCategoryKey | 'all'
  label: string
  count: number
  glyph: string
  color: string
}

export interface ArticleListQuery {
  category?: ArticleCategoryKey | 'all'
  q?: string
}

export interface ArticleListResponse {
  categories: CategorySummary[]
  articles: ArticleSummary[]
  total: number
  featuredSlug: string | null
  trendingSlugs: string[]
}

export interface ArticleDetailResponse {
  article: ArticleDetail
}
