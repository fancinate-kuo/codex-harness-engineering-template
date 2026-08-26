import { expect, test } from '@playwright/test'

test('Control Plane Overview loads its live summary', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Engineering Control Plane' })).toBeVisible()
  await expect(page.getByText('Total tasks')).toBeVisible()
  await expect(page.getByText('Benchmark pass rate')).toBeVisible()
})
