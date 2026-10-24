import {expect, test} from '@playwright/test'

import {enterFocusRoom, openUserSettings} from '../helpers/settings'

const TEST_EMAIL = 'auth-provider@example.com'

test('shares the web session across account and settings consumers after sign-out', async ({
  page,
}) => {
  let isAuthenticated = true
  let sessionReadCount = 0
  const documentRequests: Array<string> = []
  page.on('request', (request) => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
      documentRequests.push(request.url())
    }
  })
  await page.route('**/api/account', async (route) => {
    sessionReadCount += 1
    await route.fulfill(
      isAuthenticated
        ? {body: JSON.stringify({email: TEST_EMAIL}), contentType: 'application/json', status: 200}
        : {status: 401},
    )
  })
  await page.route('**/api/auth/sign-out', async (route) => {
    isAuthenticated = false
    await route.fulfill({status: 204})
  })

  await page.goto('/')
  await enterFocusRoom(page)
  await openUserSettings(page)
  await expect(page.getByText('로그인됨', {exact: true})).toBeVisible()
  await expect(page.getByText(TEST_EMAIL, {exact: true})).toBeVisible()

  await page.getByRole('link', {name: '계정 관리'}).click()
  await expect(page).toHaveURL(/\/account$/u)
  await expect(page.getByText(TEST_EMAIL, {exact: true})).toBeVisible()
  await page.getByRole('button', {name: '로그아웃'}).click()
  await expect(page.getByText('로그아웃했습니다.', {exact: true})).toBeVisible()
  await expect(page.getByRole('button', {name: '로그인 링크 받기'})).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/u)
  await openUserSettings(page)
  await expect(page.getByText('로그인하지 않았어요.', {exact: true})).toBeVisible()
  expect(sessionReadCount).toBe(2)
  expect(documentRequests).toHaveLength(1)
})
