import {expect, type Page, test} from '@playwright/test'

const TEST_EMAIL = 'auth-provider@example.com'
const TOSS_SESSION_STORAGE_KEY = '__ait_storage:pomo:app-session:v1'

const enterFocusRoom = async (page: Page): Promise<void> => {
  await page.getByRole('button', {name: '포모와 시작하기'}).click()
  await expect(page.getByRole('button', {name: '설정 열기'})).toBeVisible()
}

const openUserSettings = async (page: Page): Promise<void> => {
  await page.getByRole('button', {name: '설정 열기'}).click()
  await page.getByRole('tab', {name: '사용자'}).click()
}

test('shares the web session across account and settings consumers after sign-out', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'web')

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

test('shares the Toss session across account and settings consumers after sign-out', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'apps-in-toss')

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
