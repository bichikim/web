import unoCss from '@unocss/vite'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {build, preview} from 'vite'
import solid from 'vite-plugin-solid'
import {expect, it} from 'vitest'
import unoConfig from '../../../uno.config'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))

it('should keep the horizontal percent finite after a native fractional scroll', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'scroll-browser-'))

  try {
    const storySource = await readFile(
      `${repositoryRoot}/packages/solid-components/src/scroll/SScroll.story.tsx`,
      'utf8',
    )
    await build({
      build: {
        emptyOutDir: true,
        outDir: outputDirectory,
        rolldownOptions: {
          input: `${repositoryRoot}/packages/solid-components/browser/fixtures/scroll.html`,
        },
      },
      configFile: false,
      plugins: [
        solid({hot: false}),
        unoCss({
          ...unoConfig,
          configFile: false,
          // Extract the original Story before Solid transforms its static HTML templates.
          content: {...unoConfig.content, inline: [{code: storySource, id: 'SScroll.story.tsx'}]},
        }),
      ],
      resolve: {tsconfigPaths: true},
      root: repositoryRoot,
    })
    const server = await preview({
      build: {outDir: outputDirectory},
      configFile: false,
      preview: {host: '127.0.0.1', port: 0},
      root: repositoryRoot,
    })

    try {
      const browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      })

      try {
        const page = await browser.newPage()
        page.setDefaultTimeout(5000)
        const pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        await page.goto(
          `${server.resolvedUrls!.local[0]}packages/solid-components/browser/fixtures/scroll.html`,
        )
        const body = page.getByRole('region', {name: 'Fractional scroll area'})
        await body.waitFor().catch((error) => {
          throw new Error(`Scroll story did not mount: ${pageErrors.join('; ')}`, {cause: error})
        })
        expect(pageErrors).toEqual([])
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
  } finally {
    await rm(outputDirectory, {force: true, recursive: true})
  }
})
