import {expect, test} from '@playwright/test'

test('shows the English wake lock error after a browser denial', async ({
  baseURL,
  context,
  page,
}) => {
  if (baseURL === undefined) {
    throw new Error('The Pomo web project must define its base URL')
  }

  await context.addCookies([{name: 'PARAGLIDE_LOCALE', url: baseURL, value: 'en'}])
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: () => Promise.reject(new DOMException('Denied by the browser', 'NotAllowedError')),
      },
    })
  })

  await page.goto('/')
  await page.getByRole('button', {exact: true, name: 'Start'}).click()
  await page.getByRole('button', {name: 'Open settings'}).click()
  const settings = page.getByRole('dialog', {name: 'Pomofi settings'})
  await settings.getByRole('tab', {exact: true, name: 'General'}).click()
  const wakeLock = settings.getByRole('switch', {name: 'Keep screen awake'})
  await expect(wakeLock).toBeEnabled()
  await wakeLock.press('Space')
  await expect(
    settings.getByText('Could not keep the screen awake. Check your browser settings.'),
  ).toBeVisible()
  await expect(settings.getByRole('switch', {name: 'Keep screen awake'})).not.toBeChecked()
})
