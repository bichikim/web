import {expect, type Locator, type Page, test} from '@playwright/test'

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
  await expect(page.getByRole('status', {name: /장면 준비/u})).toHaveCount(0)
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
}

const openTimer = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', {name: /^포모도로 열기,/u}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '포모도로'})
  await expect(dialog).toBeVisible()
  return dialog
}

const enterDurations = async (dialog: Locator) => {
  await dialog.getByRole('spinbutton', {exact: true, name: '집중 횟수(회)'}).fill('2')
  await dialog.getByRole('spinbutton', {exact: true, name: '집중 시간(분)'}).fill('1')
  await dialog.getByRole('spinbutton', {exact: true, name: '짧은 휴식 시간(분)'}).fill('1')
  await dialog.getByRole('spinbutton', {exact: true, name: '긴 휴식 시간(분)'}).fill('2')
}

test('should synchronize an expired automatic break before advancing', async ({page}) => {
  await openHome(page)
  const dialog = await openTimer(page)
  const time = dialog.locator('[data-pomo-timer-ring] strong')
  const panel = dialog.getByRole('region', {name: '포모도로 타이머'})
  await dialog.getByRole('button', {name: /세션 · 집중/u}).click()
  await enterDurations(dialog)
  await dialog.getByRole('button', {exact: true, name: '설정 저장'}).click()
  await dialog
    .locator('label')
    .filter({hasText: /^집중·휴식 자동 재생$/u})
    .click()
  await dialog.getByRole('button', {exact: true, name: '집중 시작'}).click()

  await page.clock.fastForward(60_000)
  await expect(panel).toHaveAttribute('data-phase', 'shortBreak')
  await expect(dialog.getByRole('button', {exact: true, name: '일시정지'})).toBeVisible()

  const currentTime = await page.evaluate(() => Date.now())
  await page.clock.setSystemTime(new Date(currentTime + 61_000))
  await dialog.getByRole('button', {exact: true, name: '다음 단계로 이동'}).click()

  await expect(panel).toHaveAttribute('data-phase', 'focus')
  await expect(dialog.getByRole('button', {exact: true, name: '일시정지'})).toBeVisible()
  await expect(time).toHaveText('00:59')
})
