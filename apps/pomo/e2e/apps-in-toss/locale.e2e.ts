import en from '../../.i18n/messages/en.json' with {type: 'json'}
import {expect, test} from '@playwright/test'
import {enterFocusRoom, openSettings} from '../helpers/settings'

test('initializes the Apps in Toss locale without leaving the launch path', async ({page}) => {
  const documentRequestUrls: Array<string> = []
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
      documentRequestUrls.push(request.url())
    }
  })
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('PARAGLIDE_LOCALE', 'en')
  })

  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/$/u)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', {exact: true, name: 'Start'})).toBeVisible()
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    await page.title(),
  )
  expect(documentRequestUrls).toEqual([response?.url()])
})

test('keeps localized head metadata aligned after changing the display language', async ({
  page,
}) => {
  await page.goto('/')
  await enterFocusRoom(page)
  await openSettings(page)
  await page.getByRole('button', {exact: true, name: '표시 언어 한국어'}).click()
  const reloaded = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
  })
  await page.getByRole('option', {exact: true, name: 'English'}).click()
  await reloaded

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', {exact: true, name: 'Open settings'})).toBeVisible()
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    await page.title(),
  )
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    await page.title(),
  )
  await Promise.all(
    [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ].map(async (selector) => {
      await expect(page.locator(selector)).toHaveCount(1)
      await expect(page.locator(selector)).toHaveAttribute('content', en.app_home_description)
    }),
  )
})
