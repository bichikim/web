import {expect, type Page, test, type TestInfo} from '@playwright/test'

const captureBackground = async (page: Page, information: TestInfo, name: string) => {
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
  const environment = await page.evaluate(() => ({
    devicePixelRatio,
    fonts: Array.from(document.fonts).map((font) => ({family: font.family, status: font.status})),
    locale: navigator.language,
    theme: document.documentElement.className,
    time: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    viewport: {height: innerHeight, width: innerWidth},
  }))
  await information.attach(`${name}-environment`, {
    body: JSON.stringify(environment),
    contentType: 'application/json',
  })
}

test('should restore frame settings after reload and render the background tab in both themes', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // An empty playlist prevents unrelated random music selection from changing the background.
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
  const frame = dialog.getByRole('radio', {exact: true, name: '액자'})
  await expect(frame).toBeEnabled()
  await dialog.getByText('액자', {exact: true}).click()
  await expect(frame).toBeChecked()
  await expect(dialog.getByText('보여줄 사진 또는 동영상이 없어요')).toBeVisible()
  await dialog.getByText('랜덤', {exact: true}).click()
  await expect(dialog.getByRole('radio', {exact: true, name: '랜덤'})).toBeChecked()
  await dialog.getByText('최대 2장 함께 보기', {exact: true}).click()
  await expect(dialog.getByRole('switch', {name: '최대 2장 함께 보기'})).toBeChecked()
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(dialog).not.toBeVisible()

  await page.reload()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  await background.click()
  await expect(frame).toBeChecked()
  await expect(dialog.getByRole('radio', {exact: true, name: '랜덤'})).toBeChecked()
  await expect(dialog.getByRole('switch', {name: '최대 2장 함께 보기'})).toBeChecked()
  await expect(dialog.getByText('보여줄 사진 또는 동영상이 없어요')).toBeVisible()
  // Freeze only after hydration and IndexedDB restoration have completed.
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  await captureBackground(page, information, 'frame-dark')

  await dialog.getByRole('tab', {exact: true, name: '일반'}).click()
  await dialog.getByRole('button', {name: /^테마 /u}).click()
  await page.clock.runFor(200)
  await page
    .locator('[role=option]')
    .filter({hasText: /^라이트 모드$/u})
    .click()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
  await background.click()
  await captureBackground(page, information, 'frame-light')

  await dialog.getByText('캐릭터', {exact: true}).click()
  await expect(dialog.getByRole('radio', {exact: true, name: '캐릭터'})).toBeChecked()
  await expect(dialog.getByRole('radiogroup', {exact: true, name: '시간'})).toBeVisible()
  await expect(dialog.getByText('보여줄 사진 또는 동영상이 없어요')).toHaveCount(0)
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.resume()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
})
