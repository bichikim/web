import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import solid from 'vite-plugin-solid'
import {expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))

it('should keep the horizontal percent finite after a native fractional scroll', async () => {
  const server = await createServer({
    configFile: `${repositoryRoot}/.storybook/vite.config.mts`,
    plugins: [solid({hot: false})],
    root: repositoryRoot,
    server: {host: '127.0.0.1', port: 0},
  })

  try {
    await server.listen()
    const browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    })

    try {
      const page = await browser.newPage()
      await page.goto(
        `${server.resolvedUrls!.local[0]}packages/solid-components/browser/fixtures/scroll.html`,
      )
      const body = page.getByRole('region', {name: 'Fractional scroll area'})
      await body.waitFor()
      const geometry = await body.evaluate(async (element) => {
        const scrolled = new Promise<void>((resolve, reject) => {
          AbortSignal.timeout(5000).addEventListener(
            'abort',
            () => reject(new Error('Native scroll event did not arrive')),
            {once: true},
          )
          element.addEventListener('scroll', () => resolve(), {once: true})
        })
        element.scrollLeft = 1
        await scrolled

        return {
          clientWidth: element.clientWidth,
          percentX: element.style.getPropertyValue('--var-x-percent'),
          scrollLeft: element.scrollLeft,
          scrollWidth: element.scrollWidth,
        }
      })

      expect(geometry.clientWidth).toBe(200)
      expect(geometry.scrollWidth).toBe(geometry.clientWidth)
      expect(geometry.scrollLeft).toBeGreaterThan(0)
      expect(geometry.percentX).toBe('0')
    } finally {
      await browser.close()
    }
  } finally {
    await server.close()
  }
})
