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

for (const source of ['AI settings', 'calendar'] as const) {
  test(`refreshes an expired web session after a 401 from ${source}`, async ({page}) => {
    let sessionExpired = false
    let sessionReads = 0
    await page.route('**/api/account', async (route) => {
      sessionReads += 1
      await route.fulfill(sessionExpired ? {status: 401} : {json: {email: TEST_EMAIL}})
    })
    const protectedRoute =
      source === 'AI settings' ? '**/api/cloud-text' : '**/api/calendar/events?*'
    await page.route(protectedRoute, (route) =>
      route.fulfill({json: {error: 'unauthorized'}, status: 401}),
    )

    await page.goto('/')
    await enterFocusRoom(page)
    await openUserSettings(page)
    await expect(page.getByText(TEST_EMAIL, {exact: true})).toBeVisible()
    sessionExpired = true

    const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
    if (source === 'AI settings') {
      await settings.getByRole('tab', {exact: true, name: 'AI'}).click()
      await settings.getByRole('button', {name: /기본 문장 생성 모델/u}).click()
      await expect(
        page.getByRole('option', {name: 'Cloud Model (로그인 해주세요)'}),
      ).toHaveAttribute('aria-disabled', 'true')
    } else {
      await page.keyboard.press('Escape')
      await expect(settings).toBeHidden()
      await page.getByRole('button', {exact: true, name: '생각 보조'}).click()
      const dialog = page.getByRole('dialog', {name: 'Pomofi 생각 보조'})
      await dialog.getByRole('tab', {name: '캘린더'}).click()
      await expect(
        dialog.getByText('일정을 불러오기 위해 로그인하고 캘린더를 연결하세요.'),
      ).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await openUserSettings(page)
      await expect(page.getByText('로그인하지 않았어요.', {exact: true})).toBeVisible()
    }
    expect(sessionReads).toBe(2)
  })
}
