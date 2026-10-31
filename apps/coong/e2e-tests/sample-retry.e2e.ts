import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'

const [sample] = JSON.parse(
  readFileSync(new URL('../src/routes/api/preset/hidden-teenieping.json', import.meta.url), 'utf8'),
)

for (const failure of ['invalid-json', 'transport'] as const) {
  test(`should allow sample retry after ${failure} without hiding the request error`, async ({
    page,
  }) => {
    let requests = 0
    let markRequested!: () => void
    let releaseFirst!: () => void
    const requested = new Promise<void>((resolve) => {
      markRequested = resolve
    })
    const released = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const errors: Error[] = []
    page.on('pageerror', (error) => errors.push(error))
    await page.route('**/api/preset/hidden-teenieping', async (route) => {
      requests += 1
      if (requests === 1) {
        markRequested()
        await released
        if (failure === 'transport') {
          await route.abort('failed')
        } else {
          await route.fulfill({body: 'SAMPLE_FAIL', contentType: 'application/json'})
        }
        return
      }
      await route.fulfill({json: {musics: [sample]}})
    })
    await page.goto('/musics')
    const button = page.getByRole('button', {name: 'Get Sample Midi files'})
    const songs = page.getByRole('listitem', {includeHidden: true})
    await expect(songs).toHaveCount(0)
    const rejected = page.waitForEvent('pageerror')
    await button.click()
    await requested
    await expect(button).toBeDisabled()
    expect(requests).toBe(1)
    releaseFirst()
    await rejected
    expect(errors).toHaveLength(1)
    expect(requests).toBe(1)
    await expect(songs).toHaveCount(0)
    await expect(button).toBeEnabled()
    await button.click()
    await expect(songs).toHaveCount(1)
    await expect(songs.first()).toHaveAttribute('title', sample.name)
    await expect(button).toBeEnabled()
    expect(requests).toBe(2)
    expect(errors).toHaveLength(1)
  })
}
