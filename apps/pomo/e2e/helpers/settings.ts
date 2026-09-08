import {expect, type Page} from '@playwright/test'

export const enterFocusRoom = async (page: Page): Promise<void> => {
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.getByRole('button', {name: '설정'})).toBeVisible()
}

export const openUserSettings = async (page: Page): Promise<void> => {
  await page.getByRole('button', {name: '설정'}).click()
  await page.getByRole('tab', {name: '사용자'}).click()
}
