import {expect, type Page, test} from '@playwright/test'
import {enterFocusRoom} from '../helpers/settings'

const settingsKey = 'pomo:service-settings:v1'

const openServiceCalculator = async (page: Page) => {
  await page.getByRole('button', {exact: true, name: '도구'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: '도구'})
  await dialog.getByRole('button', {exact: true, name: '전역일 계산'}).click()
  const days = dialog.getByRole('textbox', {name: /복무기간 \(일\)/u})
  await expect(days).toBeEnabled()
  return {days, result: dialog.getByRole('region', {name: '예상 전역일'})}
}

test('should restore grouped service days and flag days beyond the calendar limit', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(
        key,
        JSON.stringify({branch: 'army', days: '300', manual: true, start: '2026-01-01'}),
      )
    }
  }, settingsKey)
  await page.goto('/')
  await enterFocusRoom(page)
  const first = await openServiceCalculator(page)
  await first.days.fill('５，０００')
  await expect(first.days).toHaveAttribute('aria-invalid', 'false')
  await expect(first.result).toContainText('2039-09-09')
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.days, settingsKey),
    )
    .toBe('５，０００')

  await page.reload()
  const restored = await openServiceCalculator(page)
  await expect(restored.days).toHaveValue('５，０００')
  await expect(restored.result).toContainText('2039-09-09')

  await restored.days.fill('9,007,199,254,740,991')
  await expect(restored.result).toHaveCount(0)
  await expect(restored.days).toHaveAttribute('aria-invalid', 'true')

  await restored.days.fill('1,000')
  await expect(restored.days).toHaveAttribute('aria-invalid', 'false')
  await expect(restored.result).toContainText('2028-09-26')
})
