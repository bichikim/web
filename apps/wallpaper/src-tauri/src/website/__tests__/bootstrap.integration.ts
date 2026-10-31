import {readFile} from 'node:fs/promises'
import {type Browser, chromium, webkit} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

const bootstrap = await readFile(new URL('../bootstrap.js', import.meta.url), 'utf8')
const stylesheet = '#target { background-color: rgb(22, 101, 52); }'
const initialize = (localOrigin: string | null = null) => `${bootstrap}
installWebsiteCode({localOrigin: ${JSON.stringify(localOrigin)}, css: ${JSON.stringify(stylesheet)},
start: () => { Reflect.set(window, 'started', document.body === null); },
dom: () => { document.documentElement.dataset.dom = String(document.getElementById('target') !== null); },
loaded: () => { document.documentElement.dataset.loaded = document.readyState; }});`
const html = `<!doctype html><html><head><script>
document.documentElement.dataset.site = String(Reflect.get(window, 'started'));
</script><style>#target { background-color: red; }</style></head>
<body><div id="target">Background</div><iframe src="/frame"></iframe></body></html>`

describe.each([
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
])('$name website initialization', ({engine}) => {
  let browser: Browser
  beforeAll(async () => {
    browser = await engine.launch()
  })
  afterAll(async () => {
    await browser?.close()
  })

  it('should run at document start, DOM ready and load, and keep CSS last after later edits', async () => {
    const context = await browser.newContext()
    try {
      await context.addInitScript({content: initialize()})
      await context.route('https://wallpaper.test/**', (route) =>
        route.fulfill({
          body: route.request().url().endsWith('/frame') ? '<html><body>Frame</body></html>' : html,
          contentType: 'text/html',
        }),
      )
      const page = await context.newPage()
      await page.goto('https://wallpaper.test/', {waitUntil: 'load'})
      expect(await page.locator('html').getAttribute('data-site')).toBe('true')
      expect(await page.locator('html').getAttribute('data-dom')).toBe('true')
      expect(await page.locator('html').getAttribute('data-loaded')).toBe('complete')
      await expect
        .poll(() =>
          page.locator('#target').evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .toBe('rgb(22, 101, 52)')
      await page.evaluate(() => {
        const later = document.createElement('style')
        later.textContent = '#target { background-color: blue; }'
        document.body.append(later)
      })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.lastElementChild?.id))
        .toBe('wallpaper-custom-style')
      expect(
        await page
          .locator('#target')
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      ).toBe('rgb(22, 101, 52)')
      await page.locator('#wallpaper-custom-style').evaluate((element) => element.remove())
      await expect.poll(() => page.locator('#wallpaper-custom-style').count()).toBe(1)
      await page.locator('#wallpaper-custom-style').evaluate((element) => {
        element.textContent = ''
      })
      await expect
        .poll(() =>
          page.locator('#target').evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .toBe('rgb(22, 101, 52)')
      expect(await page.frameLocator('iframe').locator('#wallpaper-custom-style').count()).toBe(0)
    } finally {
      await context.close()
    }
  })

  it('should skip the local application origin', async () => {
    const context = await browser.newContext()
    try {
      await context.addInitScript({content: initialize('https://wallpaper.test')})
      await context.route('https://wallpaper.test/**', (route) =>
        route.fulfill({body: '<html><body>App</body></html>', contentType: 'text/html'}),
      )
      const page = await context.newPage()
      await page.goto('https://wallpaper.test/', {waitUntil: 'load'})
      expect(await page.locator('#wallpaper-custom-style').count()).toBe(0)
      expect(await page.evaluate(() => Reflect.get(globalThis, 'started'))).toBeUndefined()
      expect(await page.locator('html').getAttribute('data-dom')).toBeNull()
    } finally {
      await context.close()
    }
  })
})
