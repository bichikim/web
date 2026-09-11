import {expect, type Locator, type Page, test, type TestInfo} from '@playwright/test'

const openHome = async (page: Page) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // An empty playlist removes unrelated random track selection from the background.
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
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
}

const openTimer = async (page: Page) => {
  await page.getByRole('button', {name: /^포모도로 열기,/u}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '포모도로'})
  await expect(dialog).toBeVisible()
  return dialog
}

const reloadHome = async (page: Page) => {
  // Hydration schedules work through browser timers; let it finish before freezing time again.
  await page.clock.resume()
  await page.reload()
  await expect(page.getByRole('button', {name: /^포모도로 열기,/u})).toBeVisible()
  const currentTime = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(new Date(currentTime + 1000))
}

const enterDurations = async (dialog: Locator) => {
  await dialog.getByRole('spinbutton', {exact: true, name: '집중 횟수(회)'}).fill('2')
  await dialog.getByRole('spinbutton', {exact: true, name: '집중 시간(분)'}).fill('1')
  await dialog.getByRole('spinbutton', {exact: true, name: '짧은 휴식 시간(분)'}).fill('1')
  await dialog.getByRole('spinbutton', {exact: true, name: '긴 휴식 시간(분)'}).fill('2')
}

const captureTimer = async (page: Page, information: TestInfo, name: string) => {
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

test('should render timer settings and preserve saved durations and automatic playback', async ({
  page,
}, information) => {
  await openHome(page)
  const dialog = await openTimer(page)
  const time = dialog.locator('[data-pomo-timer-ring] strong')
  await expect(time).toHaveText('25:00')
  await captureTimer(page, information, 'timer-dark')
  const routine = dialog.getByRole('button', {name: /세션 · 집중/u})
  await routine.click()
  await dialog.getByRole('spinbutton', {exact: true, name: '집중 시간(분)'}).fill('0')
  await expect(dialog.getByRole('button', {exact: true, name: '설정 저장'})).toBeDisabled()
  await enterDurations(dialog)
  await expect(dialog.getByRole('button', {exact: true, name: '설정 저장'})).toBeEnabled()
  await captureTimer(page, information, 'duration-editor-dark')
  await dialog.getByRole('button', {exact: true, name: '취소'}).click()
  await expect(time).toHaveText('25:00')
  await routine.click()
  await expect(dialog.getByRole('spinbutton', {exact: true, name: '집중 시간(분)'})).toHaveValue(
    '25',
  )
  await enterDurations(dialog)
  await dialog.getByRole('button', {exact: true, name: '설정 저장'}).click()
  await expect(time).toHaveText('01:00')
  await dialog
    .locator('label')
    .filter({hasText: /^집중·휴식 자동 재생$/u})
    .click()
  await expect(dialog.getByRole('switch', {name: '집중·휴식 자동 재생'})).toBeChecked()
  await page.keyboard.press('Escape')
  await page.clock.runFor(200)
  await expect(page.getByRole('button', {name: /^포모도로 열기,/u})).toBeFocused()

  await reloadHome(page)
  await openTimer(page)
  await expect(time).toHaveText('01:00')
  await expect(routine).toHaveText('2세션 · 집중 1분 · 짧은 휴식 1분 · 긴 휴식 2분')
  await expect(dialog.getByRole('switch', {name: '집중·휴식 자동 재생'})).toBeChecked()
})

test('should pause and restore a timer before advancing through short and long breaks', async ({
  page,
}) => {
  await openHome(page)
  const dialog = await openTimer(page)
  const time = dialog.locator('[data-pomo-timer-ring] strong')
  const panel = dialog.getByRole('region', {name: '포모도로 타이머'})
  await dialog.getByRole('button', {name: /세션 · 집중/u}).click()
  await enterDurations(dialog)
  await dialog.getByRole('button', {exact: true, name: '설정 저장'}).click()
  await dialog.getByRole('button', {exact: true, name: '집중 시작'}).click()
  await page.clock.fastForward(10_000)
  await expect(time).toHaveText('00:50')
  await dialog.getByRole('button', {exact: true, name: '일시정지'}).click()
  await page.clock.fastForward(60_000)
  await expect(time).toHaveText('00:50')
  await reloadHome(page)
  await openTimer(page)
  await expect(time).toHaveText('00:50')
  await dialog.getByRole('button', {exact: true, name: '계속하기'}).click()
  await page.clock.fastForward(50_000)
  await expect(panel).toHaveAttribute('data-phase', 'shortBreak')
  await expect(time).toHaveText('01:00')
  await expect(dialog.getByRole('button', {exact: true, name: '휴식 시작'})).toBeVisible()

  await dialog
    .locator('label')
    .filter({hasText: /^집중·휴식 자동 재생$/u})
    .click()
  await dialog.getByRole('button', {exact: true, name: '휴식 시작'}).click()
  await page.clock.fastForward(60_000)
  await expect(panel).toHaveAttribute('data-phase', 'focus')
  await expect(dialog.getByRole('button', {exact: true, name: '일시정지'})).toBeVisible()
  await page.clock.fastForward(60_000)
  await expect(panel).toHaveAttribute('data-phase', 'longBreak')
  await expect(time).toHaveText('02:00')
  await dialog.getByRole('button', {exact: true, name: '현재 세션 종료'}).click()
  await expect(dialog.getByRole('button', {exact: true, name: '긴 휴식 시작'})).toBeVisible()
  await dialog.getByRole('button', {exact: true, name: '다음 단계로 이동'}).click()
  await expect(panel).toHaveAttribute('data-phase', 'focus')
  await expect(time).toHaveText('01:00')
})
