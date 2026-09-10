/* oxlint-disable eslint/no-await-in-loop -- User clicks and their assertions must run in order. */
import {expect, type Page, test, type TestInfo} from '@playwright/test'

const captureSettings = async (page: Page, information: TestInfo, name: string) => {
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

const openSettings = async (page: Page) => {
  // Keep the background player empty so unrelated random track selection cannot change the image.
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
  await expect(dialog.getByRole('tab', {exact: true, name: '일반'})).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(dialog.getByRole('button', {name: /^테마 /u})).toBeVisible()
  return dialog
}

test('should render general settings and the theme menu in dark and light modes', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  const dialog = await openSettings(page)
  // Keep the rendered scene still while settings interactions advance only their own timers.
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  const theme = dialog.getByRole('button', {name: /^테마 /u})
  await expect(theme).toContainText('다크 모드')
  await captureSettings(page, information, 'general-dark')

  await theme.click()
  await page.clock.runFor(200)
  await page
    .locator('[role=option]')
    .filter({hasText: /^라이트 모드$/u})
    .click()
  await expect(theme).toContainText('라이트 모드')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
  await captureSettings(page, information, 'general-light')

  await theme.click()
  await page.clock.runFor(200)
  await expect(page.locator('[role=option]')).toHaveCount(3)
  await captureSettings(page, information, 'theme-menu-light')
  await page.keyboard.press('Escape')
  await page.clock.runFor(200)
  await expect(page.locator('[role=option]')).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(theme).toBeFocused()
})

test('should restore hidden toolbar controls and allow enabling them after reload', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-09-09T00:00:00.000Z'))
  const dialog = await openSettings(page)
  for (const name of ['도구 표시', '기억보조 표시', '투어 버튼 표시']) {
    const toggle = dialog.getByRole('switch', {exact: true, name})
    await expect(toggle).toBeChecked()
    await dialog
      .locator('label')
      .filter({hasText: new RegExp(`^${name}$`, 'u')})
      .click()
    await expect(toggle).not.toBeChecked()
  }
  await page.keyboard.press('Escape')
  for (const name of ['도구', '기억보조', 'Pomofi 둘러보기']) {
    await expect(page.getByRole('button', {exact: true, name})).toHaveCount(0)
  }

  await page.reload()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  for (const name of ['도구 표시', '기억보조 표시', '투어 버튼 표시']) {
    const toggle = dialog.getByRole('switch', {exact: true, name})
    await expect(toggle).not.toBeChecked()
    await dialog
      .locator('label')
      .filter({hasText: new RegExp(`^${name}$`, 'u')})
      .click()
    await expect(toggle).toBeChecked()
  }
  await page.keyboard.press('Escape')
  for (const name of ['도구', '기억보조', 'Pomofi 둘러보기']) {
    await expect(page.getByRole('button', {exact: true, name})).toBeVisible()
  }
})

test('should stop a hidden timer and restore widget visibility preferences after reload', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  const settings = await openSettings(page)
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  const trigger = page.getByRole('button', {name: /^포모도로 열기,/u})
  await trigger.click()
  const timer = page.getByRole('dialog', {exact: true, name: '포모도로'})
  await timer.getByRole('button', {exact: true, name: '집중 시작'}).click()
  await page.clock.fastForward(10_000)
  await expect(timer.locator('[data-pomo-timer-ring] strong')).toHaveText('24:50')
  await timer.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.runFor(200)
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  for (const name of ['플레이어 표시', '뽀모도로 표시']) {
    const toggle = settings.getByRole('switch', {exact: true, name})
    await expect(toggle).toBeChecked()
    await settings.locator('label').filter({hasText: name}).click()
    await expect(toggle).not.toBeChecked()
  }
  await captureSettings(page, information, 'widgets-hidden-dark')
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.runFor(200)
  await expect(trigger).toHaveCount(0)
  await expect(page.locator('.pomo-player-stage')).toHaveCount(0)

  // Let hydration finish before freezing the clock again after the reload.
  await page.clock.resume()
  await page.reload()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const currentTime = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(new Date(currentTime + 1000))
  for (const name of ['플레이어 표시', '뽀모도로 표시']) {
    await expect(settings.getByRole('switch', {exact: true, name})).not.toBeChecked()
  }
  await expect(page.locator('.pomo-player-stage')).toHaveCount(0)
  await expect(trigger).toHaveCount(0)
  for (const name of ['플레이어 표시', '뽀모도로 표시']) {
    await settings.locator('label').filter({hasText: name}).click()
    await expect(settings.getByRole('switch', {exact: true, name})).toBeChecked()
  }
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.runFor(200)
  await expect(page.locator('.pomo-player-stage')).toBeVisible()
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(timer.locator('[data-pomo-timer-ring] strong')).toHaveText('25:00')
  await expect(timer.getByRole('button', {exact: true, name: '집중 시작'})).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(timer.locator('[data-pomo-timer-ring] strong')).toHaveText('25:00')
})
