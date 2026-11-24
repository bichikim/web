import {expect, test} from 'playwright/test'

for (const isolated of [true, false]) {
  test(`renders the landing character with Rust ${isolated ? 'in an isolated page' : 'without isolation'}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const threads: number[] = []
      Object.defineProperty(globalThis, 'puppetPlaybackThreads', {value: threads})
      const WorkerConstructor = Worker
      globalThis.Worker = class extends WorkerConstructor {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          this.addEventListener('message', ({data}) => {
            if (data?.kind === 'initialized' && typeof data.threads === 'number') {
              threads.push(data.threads)
            }
          })
        }
      }
    })
    if (!isolated) {
      await page.route('/', async (route) => {
        const response = await route.fetch()
        const headers = response.headers()
        delete headers['cross-origin-embedder-policy']
        delete headers['cross-origin-opener-policy']
        await route.fulfill({headers, response})
      })
    }

    await page.goto('/')
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(isolated)
    const supportsThreads = await page.evaluate(
      () => typeof SharedArrayBuffer !== 'undefined' && navigator.hardwareConcurrency >= 4,
    )
    await expect
      .poll(() => page.evaluate(() => Reflect.get(globalThis, 'puppetPlaybackThreads')))
      .toEqual([isolated && supportsThreads ? 2 : 1])
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  })
}
