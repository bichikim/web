import {expect, test} from '@playwright/test'

test.use({locale: 'ko-KR', video: 'on'})

test('should restore the selected theme after reopening settings and reloading', async ({page}) => {
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  const settings = page.getByRole('button', {exact: true, name: '설정'})
  await settings.click()
  const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})
  const theme = dialog.getByRole('button', {name: /^테마 /u})
  await expect(theme).toContainText('다크 모드')

  await theme.click()
  await page
    .locator('[role=option]')
    .filter({hasText: /^라이트 모드$/u})
    .click()
  await expect(theme).toContainText('라이트 모드')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(settings).toBeFocused()
  await settings.click()
  await expect(theme).toContainText('라이트 모드')

  await page.reload()
  await settings.click()
  await expect(theme).toContainText('라이트 모드')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)
})

test('should follow system theme changes only while system settings is selected', async ({
  page,
}) => {
  await page.emulateMedia({colorScheme: 'light'})
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const theme = page
    .getByRole('dialog', {name: 'Pomofi 설정'})
    .getByRole('button', {name: /^테마 /u})
  await theme.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(theme).toContainText('시스템 설정')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)

  await page.emulateMedia({colorScheme: 'dark'})
  await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
  await page.emulateMedia({colorScheme: 'light'})
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/u)

  await theme.click()
  await page
    .locator('[role=option]')
    .filter({hasText: /^다크 모드$/u})
    .click()
  await expect(theme).toContainText('다크 모드')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
  await page.emulateMedia({colorScheme: 'dark'})
  await page.emulateMedia({colorScheme: 'light'})
  await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
})
