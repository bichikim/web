import {expect, type Page, test, type TestInfo} from '@playwright/test'

const captureCharacter = async (page: Page, information: TestInfo, name: string) => {
  await page.clock.runFor(200)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode()),
    )
  })
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {animations: 'disabled'})
  const current = information.outputPath(`${name}-current.png`)
  await page.screenshot({animations: 'disabled', path: current})
  await information.attach(name, {contentType: 'image/png', path: current})
  await information.attach(`${name}-environment`, {
    body: JSON.stringify(
      await page.evaluate(() => ({
        devicePixelRatio,
        fonts: Array.from(document.fonts).map((font) => ({
          family: font.family,
          status: font.status,
        })),
        locale: navigator.language,
        theme: document.documentElement.className,
        time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
        viewport: {height: innerHeight, width: innerWidth},
      })),
    ),
    contentType: 'application/json',
  })
}

test('should restore character choices after reload and render the selected scene in both themes', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // An empty playlist prevents unrelated track selection from changing the background.
  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})
  const background = dialog.getByRole('tab', {exact: true, name: '배경'})
  await background.click()
  const time = dialog.getByRole('radiogroup', {exact: true, name: '시간'})
  const activity = dialog.getByRole('radiogroup', {exact: true, name: '행동'})
  const gaze = dialog.getByRole('radiogroup', {exact: true, name: '보기'})
  await expect(time.getByRole('radio', {exact: true, name: '낮'})).toBeChecked()
  await time.getByRole('radio', {exact: true, name: '낮'}).press('ArrowRight')
  await expect(time.getByRole('radio', {exact: true, name: '밤'})).toBeChecked()
  await expect(time.getByRole('radio', {exact: true, name: '밤'})).toBeFocused()
  await activity.getByText('노트북 타이핑', {exact: true}).click()
  await expect(activity.getByRole('radio', {exact: true, name: '노트북 타이핑'})).toBeChecked()
  await gaze.getByText('사용자 보기', {exact: true}).click()
  await expect(gaze.getByRole('radio', {exact: true, name: '사용자 보기'})).toBeChecked()
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.pomo-scene')).toHaveAttribute(
    'aria-label',
    '밤 · 노트북 타이핑 · 사용자 보기',
  )

  await page.reload()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
  await expect(page.locator('.pomo-scene')).toHaveAttribute(
    'aria-label',
    '밤 · 노트북 타이핑 · 사용자 보기',
  )
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  await background.click()
  await expect(time.getByRole('radio', {exact: true, name: '밤'})).toBeChecked()
  await expect(activity.getByRole('radio', {exact: true, name: '노트북 타이핑'})).toBeChecked()
  await expect(gaze.getByRole('radio', {exact: true, name: '사용자 보기'})).toBeChecked()
  // Freeze after hydration and the restored scene have finished loading.
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  await captureCharacter(page, information, 'character-dark')

  await dialog.getByRole('tab', {exact: true, name: '일반'}).click()
  await dialog.getByRole('button', {name: /^테마 /u}).click()
  await page.clock.runFor(200)
  await page
    .locator('[role=option]')
    .filter({hasText: /^라이트 모드$/u})
    .click()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
  await background.click()
  await captureCharacter(page, information, 'character-light')
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.resume()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.pomo-scene')).toHaveAttribute(
    'aria-label',
    '밤 · 노트북 타이핑 · 사용자 보기',
  )
})
