import { ARTICLE_SLUG_PATTERN, ArticleValidationError } from '../domain/article.mjs'

const COLLECTION_PATH = '/forum/articles'

function invalidSlug(slug) {
  return new ArticleValidationError(`Invalid article slug: ${slug}`, 'INVALID_ARTICLE_SLUG')
}

function pathSlug(pathname) {
  if (!pathname.startsWith(`${COLLECTION_PATH}/`)) return null
  const value = pathname.slice(`${COLLECTION_PATH}/`.length)
  if (!value || value.includes('/')) throw invalidSlug(value)
  let slug
  try {
    slug = decodeURIComponent(value)
  } catch {
    throw invalidSlug(value)
  }
  if (!ARTICLE_SLUG_PATTERN.test(slug)) throw invalidSlug(slug)
  return slug
}

export function createForumHttpHandler(service) {
  return async function handleForumRequest({ method, pathname, searchParams }) {
    if (method !== 'GET') return null

    if (pathname === COLLECTION_PATH) {
      try {
        return {
          status: 200,
          body: await service.list({
            category: searchParams.get('category') ?? 'all',
            q: searchParams.get('q') ?? '',
          }),
        }
      } catch (error) {
        if (error instanceof ArticleValidationError && error.code === 'INVALID_FORUM_QUERY') {
          return { status: 400, body: { error: error.code, message: error.message } }
        }
        throw error
      }
    }

    let slug
    try {
      slug = pathSlug(pathname)
    } catch (error) {
      if (error instanceof ArticleValidationError) {
        return { status: 400, body: { error: error.code, message: error.message } }
      }
      throw error
    }
    if (!slug) return null
    const article = await service.get(slug)
    if (!article) return { status: 404, body: { error: 'article_not_found', slug } }
    return { status: 200, body: { article } }
  }
}
