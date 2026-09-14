import {expect, test} from '@playwright/test'

test('should reflect real fullscreen changes across settings tabs and reopening', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // Keep unrelated playlist selection and background audio out of the display comparison.
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
  const trigger = page.getByRole('button', {exact: true, name: '설정'})
  await trigger.click()
  const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
  const toggle = settings.getByRole('switch', {exact: true, name: '전체 화면'})
  const label = settings.locator('label').filter({hasText: /^전체 화면$/u})
  await expect(toggle).toBeEnabled()
  await expect(toggle).not.toBeChecked()
  await label.click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('HTML')
  await expect(toggle).toBeChecked()
  await settings.getByRole('tab', {exact: true, name: '배경'}).click()
  await settings.getByRole('tab', {exact: true, name: '일반'}).click()
  await expect(toggle).toBeChecked()

  // Freeze the prepared scene only after the real browser transition and tab remount.
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode()),
    )
  })
  await expect.soft(page).toHaveScreenshot('fullscreen-dark.png', {animations: 'disabled'})
  const current = information.outputPath('fullscreen-dark-current.png')
  await page.screenshot({animations: 'disabled', path: current})
  await information.attach('fullscreen-dark', {contentType: 'image/png', path: current})
  await information.attach('fullscreen-environment', {
    body: JSON.stringify(
      await page.evaluate(() => ({
        devicePixelRatio,
        fonts: Array.from(document.fonts).map((font) => ({
          family: font.family,
          status: font.status,
        })),
        fullscreenElement: document.fullscreenElement?.tagName,
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
  await page.clock.resume()
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(settings).not.toBeVisible()
  await trigger.click()
  await expect(toggle).toBeChecked()
  await label.click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull()
  await expect(toggle).not.toBeChecked()
  await label.click()
  await expect(toggle).toBeChecked()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('HTML')
  await expect(toggle).toBeEnabled()
  // Exercise a real external browser exit without replacing the Fullscreen API or its events.
  await page.evaluate(() => document.exitFullscreen())
  await expect(toggle).not.toBeChecked()
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(trigger).toBeFocused()
})
