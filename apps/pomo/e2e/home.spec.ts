import {expect, test} from '@playwright/test'

const INDEXABLE_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
const PRIVATE_ROBOTS = 'noindex, nofollow'

test('hydrates the home route in its configured runtime', async ({page}, testInfo) => {
  const isAppsInToss = testInfo.project.name === 'apps-in-toss'
  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  if (isAppsInToss) {
    await page.waitForFunction(() => '__ait' in window)
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-top'),
        ),
      )
      .toBe('54px')
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

test('initializes the Apps in Toss locale without leaving the launch path', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'apps-in-toss')

  const documentRequestUrls: Array<string> = []
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
      documentRequestUrls.push(request.url())
    }
  })
  await page.addInitScript(() => {
    window.localStorage.setItem('PARAGLIDE_LOCALE', 'en')
  })

  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/$/u)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', {name: 'Start with Pomo'})).toBeVisible()
  expect(documentRequestUrls).toEqual([response?.url()])
})
