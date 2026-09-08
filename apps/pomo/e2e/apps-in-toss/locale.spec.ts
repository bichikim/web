import {expect, test} from '@playwright/test'

test('initializes the Apps in Toss locale without leaving the launch path', async ({page}) => {
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
  await expect(page.getByRole('button', {exact: true, name: 'Start'})).toBeVisible()
  expect(documentRequestUrls).toEqual([response?.url()])
})
