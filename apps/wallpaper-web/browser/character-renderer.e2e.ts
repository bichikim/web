import {expect, test} from 'playwright/test'

test.describe('touch startup order', () => {
  test.use({hasTouch: true, isMobile: true, viewport: {height: 844, width: 390}})

  const profileModel = /\/models\/profile\/(?:.*\/)?model\.poffo$/

  test('renders the landing character with the selected JavaScript Worker', async ({page}) => {
    await page.route(profileModel, (route) => route.abort())
    await page.addInitScript(() => {
      const frameTimes: number[] = []
      Object.defineProperty(globalThis, 'characterWorkerFrameTimes', {value: frameTimes})
      const WorkerConstructor = Worker
      globalThis.Worker = class extends WorkerConstructor {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options)
          if (/\/worker-[\w-]+\.js$/.test(new URL(url, location.href).pathname)) {
            this.addEventListener('message', ({data}) => {
              if (data?.kind === 'produced' && data.frame.kind === 'frame') {
                frameTimes.push(data.frame.time)
              }
            })
          }
        }
      }
    })

    await page.goto('/?worker=javascript')
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() => new Set(Reflect.get(globalThis, 'characterWorkerFrameTimes')).size),
      )
      .toBeGreaterThan(1)
  })

  test('starts model preparation while the character renderer module is loading', async ({
    page,
  }) => {
    const renderer = /\/SPuppetCharacter-[\w-]+\.js$/
    const releaseRenderer = Promise.withResolvers<void>()
    await page.route(renderer, async (route) => {
      await releaseRenderer.promise
      await route.continue()
    })
    const requested = page.waitForRequest(renderer)
    const prepared = page.waitForResponse(/\/prepare-puppet-document-worker-[\w-]+\.js$/)
    try {
      await page.goto('/', {waitUntil: 'commit'})
      await requested
      expect((await prepared).ok()).toBe(true)
    } finally {
      releaseRenderer.resolve()
    }
    await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  })

  test('loads the animated background after the first character frame', async ({page}) => {
    const pause = page.getByRole('button', {exact: true, name: '일시 정지'})
    let characterWasVisible = false
    await page.route(profileModel, async (route) => {
      characterWasVisible = await pause.isVisible()
      await route.continue()
    })

    const background = page.waitForResponse(profileModel)
    await page.goto('/')
    expect((await background).ok()).toBe(true)
    expect(characterWasVisible).toBe(true)
    await expect(pause).toBeVisible()
    await expect(page.getByLabel('움직이는 프로필 배경').locator('..')).toHaveCSS('opacity', '1')
  })

  test('starts the animated background if the character fails to load', async ({page}) => {
    await page.route('**/models/white-cat/model.poffo', (route) => route.abort())
    const background = page.waitForResponse(profileModel)
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('캐릭터를 불러오지 못했어요.')
    expect((await background).ok()).toBe(true)
  })
})

test('renders the character on a return visit with the browser cache enabled', async ({page}) => {
  const worker = page.waitForResponse((response) =>
    /\/prepare-puppet-document-worker-[\w-]+\.js$/.test(new URL(response.url()).pathname),
  )
  await page.goto('/')
  const response = await worker
  expect(response.ok()).toBe(true)
  expect(response.headers()['cross-origin-embedder-policy']).toBe('require-corp')
  expect(response.headers()['cache-control']).toContain('immutable')

  const pause = page.getByRole('button', {exact: true, name: '일시 정지'})
  await expect(pause).toBeVisible()
  await page.reload()
  await expect(pause).toBeVisible()
})

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
