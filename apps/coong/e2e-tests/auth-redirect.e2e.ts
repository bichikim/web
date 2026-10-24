import {expect, test} from '@playwright/test'

test.describe('auth guard redirects (guest)', () => {
  test('allows sign-in for unauthenticated users', async ({page}) => {
    await page.goto('/auth/sign-in', {waitUntil: 'networkidle'})

    await expect(page.getByRole('heading', {name: 'Sign In'})).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/sign-in$/)
  })

  test('allows sign-up for unauthenticated users', async ({page}) => {
    await page.goto('/auth/sign-up', {waitUntil: 'networkidle'})

    await expect(page.getByRole('heading', {name: 'Sign Up'})).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/sign-up$/)
  })

  test('allows reset-password for unauthenticated users', async ({page}) => {
    await page.goto('/auth/reset-password', {waitUntil: 'networkidle'})

    await expect(page.getByRole('heading', {name: '패스워드 재설정'})).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/reset-password$/)
  })

  test('redirects unauthenticated users from private routes to sign-in', async ({page}) => {
    await page.goto('/auth/delete-account', {waitUntil: 'networkidle'})

    await expect(page).toHaveURL(/\/auth\/sign-in$/)
    await expect(page.getByRole('heading', {name: 'Sign In'})).toBeVisible()
  })
})
