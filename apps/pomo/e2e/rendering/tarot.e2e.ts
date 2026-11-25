import {expect, test} from '@playwright/test'

test('should leave the tarot illustration visible while its frame is loading', async ({page}) => {
  const releaseFrame = Promise.withResolvers<void>()
  await page.route('**/assets/frame.png*', async (route) => {
    if (route.request().resourceType() === 'image') {
      await releaseFrame.promise
    }
    await route.continue()
  })

  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '생각 보조'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: 'Pomofi 생각 보조'})
  await dialog.getByRole('tab', {exact: true, name: '타로'}).click()
  await dialog.getByRole('button', {exact: true, name: '카드 뽑기'}).click()
  const consent = page.getByRole('dialog', {name: /모델을 받을까요/u})
  await consent.getByRole('button', {exact: true, name: '취소'}).click()
  const illustration = dialog.locator('img[src*="/illustrations/"]').first()
  const frame = dialog.locator('img[src*="/frame.png"]').first()
  const frameLayer = frame.locator('..')
  try {
    await expect(illustration).toBeVisible()
    await expect(frameLayer).toHaveAttribute('aria-busy', 'true')
    await expect(frameLayer.locator('.i-tabler-moon-stars')).toHaveCount(0)
  } finally {
    releaseFrame.resolve()
  }

  await expect(frame).toBeVisible()
  await expect(frameLayer).toHaveAttribute('aria-busy', 'false')
})
