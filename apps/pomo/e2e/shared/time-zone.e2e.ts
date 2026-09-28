import {expect, test} from '@playwright/test'

const VIEWERS = [
  {date: '2026-12-31', month: '2026년 12월', timeZone: 'UTC'},
  {date: '2027-01-01', month: '2027년 1월', timeZone: 'Asia/Seoul'},
  {date: '2026-12-31', month: '2026년 12월', timeZone: 'America/New_York'},
  {date: '2027-01-01', month: '2027년 1월', timeZone: 'Pacific/Kiritimati'},
] as const

for (const viewer of VIEWERS) {
  test.describe(viewer.timeZone, () => {
    test.use({timezoneId: viewer.timeZone})
    test('should use the browser date consistently in tools', async ({page}) => {
      page.on('pageerror', (error) => console.error(error.message))
      await page.addInitScript(() => {
        sessionStorage.setItem('pomo:focus-room-entry:v1', 'true')
        // Keep date verification independent of the original scene's model download.
        localStorage.setItem('pomo:focus-room-scene-style:v1', JSON.stringify('scribble'))
      })
      await page.goto('/')
      await expect(page.getByRole('button', {exact: true, name: '도구'})).toBeVisible()
      await page.clock.setFixedTime(new Date('2026-12-31T18:00:00Z'))
      await page.getByRole('button', {exact: true, name: '도구'}).click()
      const dialog = page.getByRole('dialog', {exact: true, name: '도구'})
      await dialog.getByRole('button', {exact: true, name: '전역일 계산'}).click()
      await expect(
        dialog.getByText(`현재 기기의 날짜 ${viewer.date} 기준.`, {exact: false}),
      ).toBeVisible()
      await dialog.getByRole('button', {name: /^입대일:/u}).click()
      await expect(dialog.getByRole('button', {exact: true, name: viewer.date})).toBeVisible()
      await dialog.getByRole('button', {exact: true, name: '손 없는 날'}).click()
      await expect(
        dialog.getByRole('group', {name: `${viewer.month} 손 없는 날 달력`}),
      ).toBeVisible()
    })
  })
}
