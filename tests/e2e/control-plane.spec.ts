import { expect, test } from '@playwright/test'

test('Control Plane overview remains available at the root route', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Engineering Control Plane' })).toBeVisible()
  await expect(page.getByText('Total tasks')).toBeVisible()
  await expect(page.getByText('Benchmark pass rate')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Evaluation' })).toBeVisible()
})
