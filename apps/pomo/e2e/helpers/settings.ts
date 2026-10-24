import {expect, type Locator, type Page} from '@playwright/test'

export const enterFocusRoom = async (page: Page): Promise<void> => {
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.getByRole('button', {name: '설정'})).toBeVisible()
}

export const openSettings = async (page: Page, tabName = '일반'): Promise<Locator> => {
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})
  await dialog.getByRole('tab', {exact: true, name: tabName}).click()
  await expect(dialog.getByRole('tabpanel', {exact: true, name: tabName})).toBeVisible()
  return dialog
}

export const openUserSettings = async (page: Page): Promise<void> => {
  await openSettings(page, '사용자')
}
