import {fileURLToPath} from 'node:url'
import {expect, test} from '@playwright/test'

test('should update the artist of a queued custom track after saving the album', async ({page}) => {
  await page.route('**/audio/tracks.json', (route) =>
    route.fulfill({json: {tracks: [], version: 1}}),
  )
  await page.route('**/audio/playlist.json', (route) =>
    route.fulfill({json: {trackIds: [], version: 1}}),
  )
  await page.route('**/audio/albums.json', (route) =>
    route.fulfill({json: {albums: [], version: 1}}),
  )
  await page.route('**/api/music/albums?*', (route) =>
    route.fulfill({json: {albums: [], version: 1}}),
  )

  await page.route('**/audio/e2e-silence.wav', (route) =>
    route.fulfill({
      contentType: 'audio/wav',
      path: fileURLToPath(new URL('../fixtures/playlist/silence.wav', import.meta.url)),
    }),
  )
  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
  })
  await page.goto('/')
  await page.evaluate(async (modulePath) => {
    const {saveCustomAlbum} = (await import(
      modulePath
    )) as typeof import('../../src/features/custom-albums')
    const audio = await fetch('/audio/e2e-silence.wav').then((response) => response.blob())
    await saveCustomAlbum({
      albumId: null,
      artist: 'Original artist',
      coverIcon: 'disc',
      coverImage: {kind: 'keep'},
      coverSource: 'manual',
      title: 'Regression album',
      tracks: [
        {
          audio,
          durationSeconds: 1,
          fileName: 'silence.wav',
          id: 'custom-track:regression-album',
          title: 'Silence',
        },
      ],
    })
  }, '/src/features/custom-albums/index.ts')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  const player = page.locator('.pomo-player-stage')
  await player.getByRole('button', {exact: true, name: '플레이어 펼치기'}).click()
  const openAlbum = player.getByRole('button', {exact: true, name: '앨범 추가'})
  await openAlbum.click()
  const library = page.getByRole('dialog', {exact: true, name: '앨범'})
  const album = library.getByRole('article').filter({hasText: 'Regression album'})
  await album.getByRole('button', {exact: true, name: '앨범 모두 추가'}).click()
  await library.getByRole('button', {exact: true, name: '닫기'}).click()
  const summary = player.locator('[data-pomo-player-title]')
  const queue = player.getByRole('list')
  await expect(summary.getByText('Original artist', {exact: true})).toBeVisible()
  await expect(queue).toContainText('Original artist')
  const audio = page.locator('audio[slot="media"]')
  await expect(audio).toHaveAttribute('src', /^blob:/u)
  const audioSource = await audio.getAttribute('src')

  await openAlbum.click()
  await album.getByRole('button', {exact: true, name: '수정하기'}).click()
  const edit = page.getByRole('dialog', {exact: true, name: '나만의 앨범 수정'})
  await edit.getByRole('textbox', {name: '아티스트 (선택 사항)'}).fill('Updated artist')
  await edit.getByRole('button', {exact: true, name: '저장'}).click()
  await expect(
    album
      .getByRole('list', {name: 'Regression album 수록곡'})
      .getByText('Updated artist', {exact: true}),
  ).toBeVisible()
  await library.getByRole('button', {exact: true, name: '닫기'}).click()

  await expect(summary.getByText('Updated artist', {exact: true})).toBeVisible()
  await expect(queue).toContainText('Updated artist')
  await expect(queue.getByRole('button')).toHaveCount(1)
  await expect(audio).toHaveAttribute('src', audioSource!)
})
