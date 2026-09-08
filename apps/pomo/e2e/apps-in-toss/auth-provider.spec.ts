import {expect, test} from '@playwright/test'

import {enterFocusRoom, openUserSettings} from '../helpers/settings'

const TOSS_SESSION_STORAGE_KEY = '__ait_storage:pomo:app-session:v1'

test('shares the Toss session across account and settings consumers after sign-out', async ({
  page,
}) => {
  await page.addInitScript(
    ({storageKey}) => {
      window.localStorage.setItem(storageKey, 'e2e-toss-session')
    },
    {storageKey: TOSS_SESSION_STORAGE_KEY},
  )
  await page.route('**/api/app-auth/session', (route) => route.fulfill({status: 204}))

  await page.goto('/')
  await enterFocusRoom(page)
  await openUserSettings(page)
  await expect(page.getByText('로그인됨', {exact: true})).toBeVisible()
  await expect(page.getByText('토스', {exact: true})).toBeVisible()

  await page.getByRole('link', {name: '이메일 추가해서 웹에서도 로그인하기'}).click()
  await expect(page).toHaveURL(/\/account$/u)
  await expect(page.getByText('토스 계정으로 사용 중', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: '로그아웃'}).click()
  await expect(page.getByText('로그아웃했습니다.', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: '토스로 시작하기'})).toBeVisible()
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), TOSS_SESSION_STORAGE_KEY),
  ).toBeNull()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/u)
  await openUserSettings(page)
  await expect(page.getByText('로그인하지 않았어요.', {exact: true})).toBeVisible()
})
