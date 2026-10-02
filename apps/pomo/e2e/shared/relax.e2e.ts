import {expect, test} from '@playwright/test'

test('opens relax directly and returns to the all-in-one app', async ({page}) => {
  const response = await page.goto('/relax')

  expect(response?.ok()).toBe(true)
  const returnLink = page.getByRole('link', {name: '통합앱으로 돌아가기'})
  await expect(returnLink).toBeVisible()
  await expect(page.getByRole('button', {exact: true, name: '배경 선택'})).toBeVisible()
  await returnLink.hover()
  await expect(page.getByRole('tooltip')).toHaveText('통합앱으로 돌아가기')
  await returnLink.click()
  await expect(page).toHaveURL(/\/\?layout=all-in-one$/u)
  await expect(page.getByRole('region', {exact: true, name: 'Pomo'})).toBeVisible()
  await expect(returnLink).toHaveCount(0)

  await page.goBack()
  await expect(returnLink).toBeVisible()
})

test('shows the expanded speaker tooltip and opens volume controls', async ({page}) => {
  await page.goto('/relax')
  const volume = page.getByRole('button', {exact: true, name: '음량 조절'})

  await volume.hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toHaveText('음량 조절')
  await expect
    .poll(async () => {
      const buttonBounds = await volume.boundingBox()
      const tooltipBounds = await tooltip.boundingBox()
      if (buttonBounds === null || tooltipBounds === null) {
        return Number.POSITIVE_INFINITY
      }
      return Math.abs(
        tooltipBounds.x + tooltipBounds.width / 2 - buttonBounds.x - buttonBounds.width / 2,
      )
    })
    .toBeLessThanOrEqual(2)
  await expect
    .poll(async () => {
      const buttonBounds = await volume.boundingBox()
      const tooltipBounds = await tooltip.boundingBox()
      if (buttonBounds === null || tooltipBounds === null) {
        return Number.POSITIVE_INFINITY
      }
      return Math.abs(buttonBounds.y - tooltipBounds.y - tooltipBounds.height)
    })
    .toBeLessThanOrEqual(16)
  await volume.click()
  await expect(page.getByRole('dialog', {name: '음량 조절'})).toBeVisible()
  await expect(page.getByRole('tooltip')).not.toBeVisible()
})
