import {expect, type Page, test} from 'playwright/test'

test.describe('prerendered landing page', () => {
  test.use({javaScriptEnabled: false})

  test('shows the styled widget poster and sharing metadata without JavaScript', async ({page}) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBe(true)
    await expect(page).toHaveTitle('Poffo Wallpaper — 캐릭터 위젯과 움직이는 배경화면')
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://wallpaper.poffo.io/',
    )
    await expect(page.getByRole('main', {name: 'Poffo Wallpaper 체험'})).toBeVisible()
    const poster = page.getByRole('img', {name: '흰 고양이 캐릭터 위젯'})
    await expect(poster).toBeVisible()
    await expect(poster).toHaveCSS('object-fit', 'contain')
    await expect(poster).toHaveJSProperty('naturalWidth', 640)
  })
})

test('serves the speech model notices as a static text file', async ({request}) => {
  const notices = await request.get('/licenses/speech.txt')
  expect(notices.ok()).toBe(true)
  expect(notices.headers()['content-type']).toContain('text/plain')
  expect(await notices.text()).toContain('Supertonic 3 by Supertone')
})

test('loads the embedded character and advances product scenes', async ({page}) => {
  const errors: string[] = []
  const externalAtlases: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/models/white-cat/atlas-*.webp', (route) => {
    externalAtlases.push(route.request().url())
    return route.abort()
  })
  const download = page.waitForResponse(
    (response) =>
      response.url().endsWith('/models/white-cat/model.poffo') &&
      response.request().method() === 'GET',
  )
  await page.goto('/')
  const asset = await download
  expect(asset.ok()).toBe(true)
  const binary = await page.request.get('/models/white-cat/model.poffo')
  expect(binary.ok()).toBe(true)
  const content = await binary.body()
  expect(content.subarray(0, 5).toString()).toBe('POFFO')
  // Budget for the updated Ash rig and its four embedded atlases.
  expect(content.byteLength).toBeLessThan(9_700_000)
  // This control appears only after the character Player renders its first frame.
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  const music = page.getByRole('region', {name: '음악 플레이어'})
  await music.getByRole('button', {name: '음악 재생'}).click()
  await expect(music.getByRole('button', {name: '음악 일시 정지'})).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await music.getByRole('button', {name: '음악 일시 정지'}).click()
  await expect(music.getByRole('button', {name: '음악 재생'})).toBeEnabled()
  await page.getByRole('button', {name: '스크롤로 앱 살펴보기'}).click()
  const story = page.getByRole('region', {name: 'Poffo Wallpaper 앱 소개'})
  await expect(story.getByRole('heading', {name: 'YOUR DESKTOP.'})).toBeVisible()
  await expect(story.locator('..')).toHaveJSProperty('inert', false)
  await expect(story.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  await expect(page.getByText('01 / 06', {exact: true})).toBeVisible()
  await expect(page.getByText('SCROLL TO EXPLORE ↓', {exact: true})).toHaveCSS(
    'pointer-events',
    'none',
  )
  await page.keyboard.press('PageDown')
  await expect(story.getByRole('heading', {name: 'CHANGE THE VIEW.'})).toBeVisible()
  await expect(story.locator('..')).toHaveJSProperty('inert', false)
  await expect(story.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  await expect(page.getByText('02 / 06', {exact: true})).toBeVisible()
  const desktop = page.getByRole('region', {name: 'Poffo Wallpaper 데스크톱 미리보기'})
  await expect(desktop.getByLabel('창가 라이브 배경')).toHaveJSProperty('muted', true)
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
      return new Promise<number[]>((resolve) => {
        // Pause on insertion, before a slow frame can dispatch both start and end events.
        const sample = () => {
          const overlay = document.querySelector(
            `[data-story-style="bands"][data-story-transition="${phase}"]`,
          )
          if (overlay === null) {
            return false
          }
          observer.disconnect()
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
          return true
        }
        const observer = new MutationObserver(sample)
        observer.observe(document, {
          attributeFilter: ['data-story-transition'],
          childList: true,
          subtree: true,
        })
        if (sample()) {
          return
        }
        if (key === null) {
          document
            .querySelector('[data-story-transition]')
            ?.getAnimations({subtree: true})
            .forEach((animation) => animation.play())
        } else {
          globalThis.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key}))
        }
      })
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
