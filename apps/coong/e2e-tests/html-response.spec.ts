import {expect, test} from '@playwright/test'

test('serves HTML for the home page', async ({page}) => {
  const response = await page.goto('/', {waitUntil: 'domcontentloaded'})

  expect(response, 'Expected a main document response').not.toBeNull()

  const status = response!.status()

  expect(status).toBeGreaterThanOrEqual(200)
  expect(status).toBeLessThan(500)

  const contentType = response!.headers()['content-type'] ?? ''

  expect(contentType).toContain('text/html')

  const body = await response!.text()

  expect(body.toLowerCase()).toContain('<html')
})
