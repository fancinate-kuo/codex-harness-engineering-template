import { expect, test } from '@playwright/test'

test('Sora forum homepage supports discovery and sign in', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /值得思考的事.*值得被分享/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible()
  await expect(page.getByText('當科技變得安靜，我們終於聽見自己')).toBeVisible()

  await page.getByRole('button', { name: /設計/ }).first().click()
  await expect(page.getByRole('button', { name: '閱讀文章：留白不是空白，是給想法呼吸的地方' })).toBeVisible()

  await page.getByRole('button', { name: '開啟搜尋' }).click()
  await page.getByRole('searchbox', { name: '搜尋文章、主題或作者' }).fill('留白')
  await page.getByRole('searchbox', { name: '搜尋文章、主題或作者' }).press('Enter')
  await expect(page.getByText('搜尋結果')).toBeVisible()
  await expect(page.getByRole('button', { name: '閱讀文章：留白不是空白，是給想法呼吸的地方' })).toBeVisible()

  await page.getByRole('button', { name: '登入' }).click()
  await expect(page.getByRole('heading', { name: /把喜歡的想法.*留在身邊/ })).toBeVisible()
  await page.getByRole('button', { name: '使用 Apple 登入' }).click()
  await expect(page.getByRole('button', { name: '使用者選單' })).toBeVisible()
})

test('Sora mobile layout keeps secondary rails collapsible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '全部文章' })).toBeVisible()
  const trendingToggle = page.getByRole('button', { name: '熱門文章' })
  await expect(trendingToggle).toHaveAttribute('aria-expanded', 'false')
  await trendingToggle.click()
  await expect(trendingToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: /01 留白不是空白/ })).toBeVisible()
})
