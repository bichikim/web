import {fileURLToPath} from 'node:url'
import {expect, test} from '@playwright/test'

const FIXTURE_ORIGIN = 'http://127.0.0.1:44175'
const COVER_URL = 'https://example.com/album-cover.webp'
const ALBUM_ID = '11111111-1111-4111-8111-111111111111'

test('should retain the local cover through entry and failed URL save, then release it on success', async ({
  page,
}) => {
  let uploads = 0
  let saves = 0
  await page.route('**/api/admin/music/covers', (route) => {
    uploads += 1
    return route.fulfill({
      json: {coverImageUrl: 'https://example.com/file.webp', coverReservationId: ALBUM_ID},
    })
  })
  await page.route('**/api/admin/music/albums', (route) => {
    saves += 1
    return saves === 1
      ? route.fulfill({status: 500})
      : route.fulfill({json: {id: ALBUM_ID}, status: 201})
  })
  await page.route('**/test/unavailable-cover.webp', (route) => route.fulfill({status: 404}))
  await page.goto(`${FIXTURE_ORIGIN}/album-covers`)
  const form = page.getByRole('form', {name: '앨범 초안 만들기'})
  const save = form.getByRole('button', {name: '앨범 초안 만들기'})
  await expect(save).toBeEnabled()
  await form.getByRole('textbox', {exact: true, name: '앨범명'}).fill('테스트 앨범')
  await form.getByRole('textbox', {exact: true, name: '설명'}).fill('앨범 설명')
  await form
    .getByLabel('이미지 파일')
    .setInputFiles(fileURLToPath(new URL('../../public/favicon.png', import.meta.url)))
  const preview = form.getByRole('img', {name: '업로드할 앨범 커버 미리보기'})
  await expect(preview).toBeVisible()
  await form.getByText('다른 방식 사용', {exact: true}).click()
  await form.getByRole('textbox', {name: '외부 HTTPS 주소'}).fill(COVER_URL)
  await expect(preview).toBeVisible()

  const failure = page.waitForResponse(
    (response) => response.url().endsWith('/api/admin/music/albums') && response.status() === 500,
  )
  await save.click()
  await failure
  await expect(page.getByRole('status')).toContainText('저장하지 못했습니다')
  await expect(preview).toBeVisible()

  const succeeded = page.waitForResponse(
    (response) => response.url().endsWith('/api/admin/music/albums') && response.status() === 201,
  )
  await save.click()
  const response = await succeeded
  expect(response.request().postDataJSON()).toMatchObject({
    coverDraftId: null,
    coverImageUrl: COVER_URL,
    coverReservationId: null,
  })
  await expect(preview).toHaveCount(0)
  await expect(form.getByRole('textbox', {name: '외부 HTTPS 주소'})).toHaveValue('')
  expect(uploads).toBe(0)
})

test('should show the album type glyph when a navigation cover request fails', async ({page}) => {
  await page.route('**/test/unavailable-cover.webp', (route) => route.fulfill({status: 404}))
  await page.goto(`${FIXTURE_ORIGIN}/album-covers`)

  const navigation = page.getByRole('navigation', {name: '등록된 앨범'})
  const album = navigation.getByRole('button', {name: /등록된 앨범 이름/u})
  await expect(album.getByText('CD', {exact: true})).toBeVisible()
  await expect(album.locator('img')).toHaveCount(0)
})
