import {expect, test} from 'playwright/test'
import covers from '../public/music/ash-afternoon/covers.json' with {type: 'json'}

for (const bitmap of [true, false]) {
  test(`presents and advances album covers with bitmap decoding ${bitmap ? 'available' : 'unavailable'}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({height: 844, width: 390})
    await page.route('**/models/**/*.poffo', (route) => route.abort())
    if (!bitmap) {
      await page.addInitScript(() => {
        Object.defineProperty(globalThis, 'createImageBitmap', {value: undefined})
      })
    }
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText('캐릭터를 불러오지 못했어요.')
    await page.keyboard.press('PageDown')
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    const canvas = page.getByLabel('실제 Wallpaper 앱 배경 전환')
    await expect(canvas).toHaveCSS('opacity', '1')
    const retained = await canvas.elementHandle()
    await expect(page.getByRole('img', {name: '노트북 앨범 배경'})).toHaveAttribute(
      'src',
      covers.tracks[1]!.artwork,
    )
    await page.keyboard.press('PageUp')
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await expect(page.getByRole('button', {name: '대사 선택'})).toBeEnabled()
    await expect(canvas).toBeHidden()
    await page.keyboard.press('PageDown')
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await expect(canvas).toBeVisible()
    await page.keyboard.press('PageDown')
    await expect(page.getByLabel('창가 라이브 배경')).toBeVisible()
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    const image = page.getByRole('img', {includeHidden: true, name: '노트북 앨범 배경'})
    await expect(image).toHaveCSS('animation-play-state', 'paused')
    await page.keyboard.press('PageUp')
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await expect(canvas).toBeVisible()
    expect(await canvas.evaluate((element, previous) => element === previous, retained)).toBe(true)
    expect(
      await page.getByLabel('창가 라이브 배경').evaluate((video: HTMLVideoElement) => video.paused),
    ).toBe(true)
    await expect(image).toHaveCSS('animation-play-state', 'running')
    await expect(image).toHaveAttribute('src', covers.tracks[2]!.artwork)
    expect(errors).toEqual([])
  })
}

test('keeps the unvisited album unmounted when returning from a live-only desktop visit', async ({
  page,
}) => {
  await page.setViewportSize({height: 844, width: 390})
  await page.route('**/models/**/*.poffo', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('캐릭터를 불러오지 못했어요.')
  await page.keyboard.press('End')
  await expect(page.locator('[data-story-transition]')).toHaveCount(0)
  await expect(page.locator('[data-story-chapter="5"]')).toBeVisible()
  await [4, 3, 2, 1].reduce(async (previous, chapter) => {
    await previous
    await page.keyboard.press('PageUp')
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    await expect(page.locator(`[data-story-chapter="${chapter}"]`)).toBeVisible()
  }, Promise.resolve())
  await expect(page.getByLabel('창가 라이브 배경')).toBeVisible()
  const album = page.getByRole('img', {includeHidden: true, name: '노트북 앨범 배경'})
  await expect(album).toHaveCount(0)
  await page.keyboard.press('Home')
  await expect(page.locator('[data-story-transition]')).toHaveCount(0)
  await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
  await expect(album).toHaveCount(0)
  await page.keyboard.press('PageDown')
  await expect(page.locator('[data-story-transition]')).toHaveCount(0)
  await expect(album).toBeVisible()
  await expect(page.getByLabel('실제 Wallpaper 앱 배경 전환')).toHaveCSS('opacity', '1')
})
