import {expect, test} from 'playwright/test'

test('loads the embedded character and advances product scenes', async ({page}) => {
  const errors: string[] = []
  const externalAtlases: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/models/white-cat/atlas-*.webp', (route) => {
    externalAtlases.push(route.request().url())
    return route.abort()
  })
  const download = page.waitForResponse((response) =>
    response.url().endsWith('/models/white-cat/model.poffo'),
  )
  await page.goto('/')
  expect((await download).ok()).toBe(true)
  // This control appears only after the character Player renders its first frame.
  await expect(page.getByRole('button', {exact: true, name: '일시 정지'})).toBeVisible()
  await page.getByRole('button', {name: '스크롤로 앱 살펴보기'}).click()
  await expect(page.getByRole('heading', {name: 'YOUR DESKTOP.'})).toBeVisible()
  await expect(page.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  await page.keyboard.press('PageDown')
  await expect(page.getByRole('heading', {name: 'CHANGE THE VIEW.'})).toBeVisible()
  await expect(page.getByRole('button', {name: /소개 음성 (듣기|멈추기)/})).toBeEnabled()
  expect(externalAtlases).toEqual([])
  expect(errors).toEqual([])
})
