import {expect, type Page, test} from 'playwright/test'

test('loads the embedded character and advances product scenes', async ({page}) => {
  const errors: string[] = []
  const externalAtlases: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/models/white-cat/atlas-*.webp', (route) => {
    externalAtlases.push(route.request().url())
    return route.abort()
  })
  const download = page.waitForResponse((response) =>
    response.url().endsWith('/models/white-cat/model.poffo'),
  )
  await page.goto('/')
  expect((await download).ok()).toBe(true)
  // This control appears only after the character Player renders its first frame.
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  await page.getByRole('button', {name: '스크롤로 앱 살펴보기'}).click()
  await expect(page.getByRole('heading', {name: 'YOUR DESKTOP.'})).toBeVisible()
  await expect(page.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  await page.keyboard.press('PageDown')
  await expect(page.getByRole('heading', {name: 'CHANGE THE VIEW.'})).toBeVisible()
  await expect(page.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  expect(externalAtlases).toEqual([])
  expect(errors).toEqual([])
})

const sampleBands = async (
  page: Page,
  phase: 'cover' | 'reveal',
  key: 'PageDown' | 'PageUp' | null,
) =>
  page.evaluate(
    async ({phase, key}) => {
      const sampled = new Promise<number[]>((resolve) => {
        const handleStart = (event: AnimationEvent) => {
          const target = event.target
          if (!(target instanceof Element)) {return}
          const overlay = target.closest(
            `[data-story-style="bands"][data-story-transition="${phase}"]`,
          )
          if (overlay === null) {return}
          document.removeEventListener('animationstart', handleStart, true)
          for (const animation of overlay.getAnimations({subtree: true})) {
            animation.pause()
            const timing = animation.effect!.getTiming()
            animation.currentTime =
              Number(timing.delay) + Number(timing.duration) * (phase === 'cover' ? 0.99 : 0.5)
          }
          resolve(
            Array.from(overlay.querySelectorAll('p')).map(
              (row) => row.getBoundingClientRect().right,
            ),
          )
        }
        document.addEventListener('animationstart', handleStart, true)
      })
      if (key === null) {
        document
          .querySelector('[data-story-transition]')
          ?.getAnimations({subtree: true})
          .forEach((animation) => animation.play())
      } else {
        globalThis.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key}))
      }
      return sampled
    },
    {key, phase},
  )

const assertBandsFilled = async (page: Page, key: 'PageDown' | 'PageUp') => {
  const covered = await sampleBands(page, 'cover', key)
  expect(covered).toHaveLength(18)
  expect(Math.min(...covered)).toBeGreaterThanOrEqual(page.viewportSize()!.width)
  const revealing = await sampleBands(page, 'reveal', null)
  expect(revealing).toHaveLength(18)
  expect(Math.min(...revealing)).toBeGreaterThanOrEqual(page.viewportSize()!.width)
  await page.evaluate(() => {
    document
      .querySelector('[data-story-transition]')
      ?.getAnimations({subtree: true})
      .forEach((animation) => animation.play())
  })
  await expect(page.locator('[data-story-transition]')).toHaveCount(0)
  await expect(
    page.getByRole('heading', {
      name: key === 'PageDown' ? 'CHANGE THE VIEW.' : 'YOUR DESKTOP.',
    }),
  ).toBeVisible()
}

for (const viewport of [
  {height: 900, width: 1280},
  {height: 1440, width: 2560},
  {height: 1440, width: 3440},
  {height: 844, width: 390},
]) {
  test(`fills horizontal transition text in both directions at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', {name: '스크롤로 앱 살펴보기'}).click()
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await assertBandsFilled(page, 'PageDown')
    await assertBandsFilled(page, 'PageUp')
  })
}
