import { describe, expect, it } from 'vitest'
import { ForumArticleService } from '../../apps/api/src/modules/forum/application/article-service.mjs'
import { FileArticleRepository } from '../../apps/api/src/modules/forum/infrastructure/file-article-repository.mjs'

describe('Sora filesystem article repository', () => {
  const service = new ForumArticleService(new FileArticleRepository())

  it('loads the seeded published articles in newest-first order', async () => {
    const result = await service.list()
    expect(result.total).toBe(6)
    expect(result.articles[0]).toMatchObject({
      slug: 'quiet-technology',
      title: '當科技變得安靜，我們終於聽見自己',
    })
    expect(result.categories.find(category => category.key === 'technology')).toMatchObject({ count: 2 })
    expect(result.trendingSlugs).toEqual([
      'space-to-breathe',
      'what-ai-leaves-behind',
      'notification-free-afternoon',
      'before-the-light-falls',
    ])
  })

  it('filters by category and search text while keeping category totals', async () => {
    const category = await service.list({ category: 'design' })
    expect(category.total).toBe(1)
    expect(category.articles[0].slug).toBe('space-to-breathe')
    expect(category.categories.find(item => item.key === 'technology')).toMatchObject({ count: 2 })

    const search = await service.list({ q: '留白' })
    expect(search.total).toBe(1)
    expect(search.articles[0].slug).toBe('space-to-breathe')
  })

  it('returns full detail for a slug and null for an unknown article', async () => {
    await expect(service.get('space-to-breathe')).resolves.toMatchObject({
      slug: 'space-to-breathe',
      content: expect.any(Array),
    })
    await expect(service.get('missing-article')).resolves.toBeNull()
  })
})
