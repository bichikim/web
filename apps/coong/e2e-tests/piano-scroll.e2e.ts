import {expect, test} from '@playwright/test'

test('should retain the piano scroll ratio across a non-scrollable viewport and reload', async ({
  page,
}) => {
  await page.setViewportSize({height: 900, width: 1000})
  await page.goto('/piano')
  await expect(page.getByText('Get Sample Midi files to play music now')).toBeVisible()
  const piano = page.getByRole('main')
  await expect
    .poll(() => piano.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeGreaterThan(0)
  await piano.evaluate((element) => {
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 4
  })
  const storedRatio = () => page.evaluate(() => localStorage.getItem('coong__piano-scroll-left'))
  await expect.poll(storedRatio).toBe('0.25')

  await page.setViewportSize({height: 900, width: 10000})
  await expect
    .poll(() => piano.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBe(0)
  await expect.poll(() => piano.evaluate((element) => element.scrollLeft)).toBe(0)
  // Flush the same JSX event boundary after the browser clamps the scroll position.
  await piano.dispatchEvent('scroll')
  await expect.poll(storedRatio).toBe('0.25')

  await page.setViewportSize({height: 900, width: 1000})
  await page.reload()
  await expect
    .poll(() =>
      piano.evaluate((element) => element.scrollLeft / (element.scrollWidth - element.clientWidth)),
    )
    .toBeCloseTo(0.25, 2)
  await piano.evaluate((element) => {
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2
  })
  await expect.poll(storedRatio).toBe('0.5')
})
