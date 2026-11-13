import {expect, test} from 'playwright/test'

test('traverses every story boundary in both directions independently of character rendering', async ({
  page,
}) => {
  await page.setViewportSize({height: 844, width: 390})
  await page.route('**/models/**/*.poffo', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('캐릭터를 불러오지 못했어요.')
  const forward = [0, 1, 2, 3, 4, 5].map((chapter) => ({chapter, key: 'PageDown'}))
  const backward = [4, 3, 2, 1, 0, -1].map((chapter) => ({chapter, key: 'PageUp'}))
  await [...forward, ...backward].reduce(async (previous, step) => {
    await previous
    await page.keyboard.press(step.key)
    await expect(page.locator('[data-story-transition]')).toHaveCount(0)
    if (step.chapter < 0) {
      await expect(page.getByRole('navigation', {name: '체험 도구'})).toBeVisible()
    } else {
      await expect(page.locator(`[data-story-chapter="${step.chapter}"]`)).toBeVisible()
    }
  }, Promise.resolve())
})
