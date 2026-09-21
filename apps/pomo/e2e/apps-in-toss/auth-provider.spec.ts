import {expect, test} from '@playwright/test'

import {enterFocusRoom, openUserSettings} from '../helpers/settings'

const TOSS_SESSION_STORAGE_KEY = '__ait_storage:pomo:app-session:v1'

test('should share a delayed Toss session across account and settings after sign-out', async ({
  page,
}) => {
  await page.addInitScript(
    ({storageKey}) => {
      globalThis.localStorage.setItem(storageKey, 'e2e-toss-session')
    },
    {storageKey: TOSS_SESSION_STORAGE_KEY},
  )
  const release = Promise.withResolvers<void>()
  await page.route('**/api/app-auth/session', async (route) => {
    await release.promise
    await route.fulfill({status: 204})
  })

  const sessionResponse = page.waitForResponse('**/api/app-auth/session')
  await Promise.all([
    sessionResponse,
    (async () => {
      try {
        await page.goto('/')
        await enterFocusRoom(page)
        await openUserSettings(page)
        const panel = page.getByRole('tabpanel', {exact: true, name: '사용자'})
        await expect(panel.getByRole('status')).toHaveText('계정 확인 중…')
      } finally {
        release.resolve()
      }
    })(),
  ])
  expect((await sessionResponse).status()).toBe(204)
  await expect(page.getByText('로그인됨', {exact: true})).toBeVisible()
  await expect(page.getByText('토스', {exact: true})).toBeVisible()

  await page.getByRole('link', {name: '이메일 추가해서 웹에서도 로그인하기'}).click()
  await expect(page).toHaveURL(/\/account$/u)
  await expect(page.getByRole('heading', {exact: true, name: '계정 관리'})).toBeVisible()
  await expect(page.getByText('토스 계정으로 사용 중', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: '로그아웃'}).click()
  await expect(page.getByText('로그아웃했습니다.', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: '토스로 시작하기'})).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate((key) => globalThis.localStorage.getItem(key), TOSS_SESSION_STORAGE_KEY),
    )
    .toBeNull()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/u)
  await openUserSettings(page)
  await expect(page.getByText('로그인하지 않았어요.', {exact: true})).toBeVisible()
})
