import {expect, type Page, test} from 'playwright/test'

interface DiagonalSample {
  readonly keys: string[]
  readonly scenes: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
}

const sampleDiagonal = (page: Page, phase: 'cover' | 'reveal', key: string | null) =>
  page.evaluate(
    ({phase, key}) =>
      new Promise<DiagonalSample>((resolve) => {
        const animations = () => [
          ...new Set(
            [...document.querySelectorAll('[data-story-transition],[data-story-mask]')].flatMap(
              (element) => element.getAnimations({subtree: true}),
            ),
          ),
        ]
        const sample = () => {
          if (
            document.querySelector(
              `[data-story-style="diagonal"][data-story-transition="${phase}"]`,
            ) === null
          ) {
            return false
          }
          observer.disconnect()
          const active = animations()
          active.forEach((animation) => {
            animation.pause()
            const timing = animation.effect!.getTiming()
            animation.currentTime = Number(timing.delay) + Number(timing.duration) / 2
          })
          const keys = active.flatMap((animation) =>
            animation.effect instanceof KeyframeEffect
              ? animation.effect.getKeyframes().flatMap(Object.keys)
              : [],
          )
          const scenes = [...document.querySelectorAll('[data-story-mask] > div')].map(
            (element) => {
              const {height, width, x, y} = element.getBoundingClientRect()
              return {height, width, x, y}
            },
          )
          resolve({keys, scenes})
          return true
        }
        const observer = new MutationObserver(sample)
        observer.observe(document, {childList: true, subtree: true})
        if (sample()) {
          return
        }
        if (key === null) {
          animations().forEach((animation) => animation.finish())
        } else {
          globalThis.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key}))
        }
      }),
    {key, phase},
  )

for (const viewport of [
  {height: 844, width: 390},
  {height: 900, width: 1280},
  {height: 1440, width: 3440},
]) {
  test(`keeps diagonal masks and artwork on transform animations at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.route('**/models/**/*.poffo', (route) => route.abort())
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('캐릭터를 불러오지 못했어요.')
    const forward = await sampleDiagonal(page, 'cover', 'PageDown')
    expect(forward.keys).toContain('transform')
    expect(forward.keys).not.toContain('clipPath')
    const reveal = await sampleDiagonal(page, 'reveal', null)
    expect(reveal.keys).not.toContain('clipPath')
    await page.evaluate(() => {
      document.querySelectorAll('[data-story-transition],[data-story-mask]').forEach((element) => {
        element.getAnimations({subtree: true}).forEach((animation) => animation.finish())
      })
    })
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    const reverse = await sampleDiagonal(page, 'cover', 'PageUp')
    expect(reverse.keys).not.toContain('clipPath')
    const reverseReveal = await sampleDiagonal(page, 'reveal', null)
    for (const sample of [forward, reveal, reverse, reverseReveal]) {
      expect(sample.scenes.length).toBeGreaterThan(0)
      for (const scene of sample.scenes) {
        expect(scene.x).toBeCloseTo(0, 1)
        expect(scene.y).toBeCloseTo(0, 1)
        expect(scene.width).toBeCloseTo(viewport.width, 1)
        expect(scene.height).toBeCloseTo(viewport.height, 1)
      }
    }
    await page.evaluate(() => {
      document.querySelectorAll('[data-story-transition],[data-story-mask]').forEach((element) => {
        element.getAnimations({subtree: true}).forEach((animation) => animation.finish())
      })
    })
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await expect(page.getByRole('button', {name: '대사 선택'})).toBeEnabled()
  })
}
