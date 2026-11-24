import {expect, test} from '@playwright/test'

test('serves English copy and a 404 status on direct navigation', async ({
  baseURL,
  context,
  page,
}) => {
  if (baseURL === undefined) {
    throw new Error('The Pomo web project must define its base URL')
  }

  await context.addCookies([{name: 'PARAGLIDE_LOCALE', url: baseURL, value: 'en'}])
  const response = await page.goto('/missing-e2e-localized-page')
  expect(response?.status()).toBe(404)
  await expect(page).toHaveTitle('Page not found — Pomofi')
  await expect(page.getByRole('heading', {name: 'Page not found'})).toBeVisible()
  await expect(page.getByText('Check the address or return to the Pomofi home page.')).toBeVisible()
  await expect(page.getByRole('link', {name: 'Back to app'})).toBeVisible()
})
