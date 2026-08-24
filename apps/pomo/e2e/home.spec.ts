import {expect, test} from '@playwright/test'

const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const PRIVATE_ROBOTS = 'noindex, nofollow'

test('hydrates the home route in its configured runtime', async ({page}, testInfo) => {
  const isAppsInToss = testInfo.project.name === 'apps-in-toss'
  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  if (isAppsInToss) {
    await expect(page).toHaveURL(/\/(?:en|ko)\/?$/u)
    await page.waitForFunction(() => '__ait' in window)
    await expect(page.locator('html')).toHaveAttribute(
      'style',
      /--pomo-safe-area-inset-top:\s*0px/u,
    )
  } else {
    expect(await page.evaluate(() => '__ait' in window)).toBe(false)
  }

  await expect(page).toHaveTitle('Pomofi')
  await expect(page.getByRole('region', {exact: true, name: 'Pomo'})).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    isAppsInToss ? PRIVATE_ROBOTS : INDEXABLE_ROBOTS,
  )
})
