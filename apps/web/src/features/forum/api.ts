import type {
  ArticleCategoryKey,
  ArticleDetailResponse,
  ArticleListQuery,
  ArticleListResponse,
} from '@harness/contracts'

class ForumApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ForumApiError'
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`)
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const body = await response.json() as { message?: string; error?: string }
      detail = body.message ?? body.error ?? detail
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new ForumApiError(detail, response.status)
  }
  return response.json() as Promise<T>
}

export async function getForumArticles(
  query: ArticleListQuery = {},
): Promise<ArticleListResponse> {
  const params = new URLSearchParams()
  if (query.category && query.category !== 'all') params.set('category', query.category)
  if (query.q?.trim()) params.set('q', query.q.trim())
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return requestJson<ArticleListResponse>(`/forum/articles${suffix}`)
}

export async function getForumArticle(slug: string) {
  return requestJson<ArticleDetailResponse>(`/forum/articles/${encodeURIComponent(slug)}`)
}

export function isForumCategory(value: unknown): value is ArticleCategoryKey | 'all' {
  return value === 'all'
    || value === 'technology'
    || value === 'design'
    || value === 'life'
    || value === 'photo'
    || value === 'developer'
}

export { ForumApiError }
