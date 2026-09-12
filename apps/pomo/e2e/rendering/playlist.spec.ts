import {fileURLToPath} from 'node:url'
import {expect, type Page, test, type TestInfo} from '@playwright/test'

const tracks = [
  {
    artist: 'E2E Artist',
    durationSeconds: 1,
    id: 'first',
    source: '/audio/e2e-silence.wav',
    title: 'First Track',
  },
  {
    artist: 'E2E Artist',
    durationSeconds: 1,
    id: 'second',
    source: '/audio/e2e-silence.wav',
    title: 'Second Track',
  },
]

const capturePlaylist = async (page: Page, information: TestInfo, name: string) => {
  await page.clock.runFor(200)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode()),
    )
  })
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {animations: 'disabled'})
  const current = information.outputPath(`${name}-current.png`)
  await page.screenshot({animations: 'disabled', path: current})
  await information.attach(name, {contentType: 'image/png', path: current})
  await information.attach(`${name}-environment`, {
    body: JSON.stringify(
      await page.evaluate(() => ({
        devicePixelRatio,
        fonts: Array.from(document.fonts).map((font) => ({
          family: font.family,
          status: font.status,
        })),
        locale: navigator.language,
        theme: document.documentElement.className,
        time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
        viewport: {height: innerHeight, width: innerWidth},
      })),
    ),
    contentType: 'application/json',
  })
}

test('should undo clearing a playlist and preserve an intentionally empty queue after reload', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // Catalog responses and silent media isolate queue actions from external music services.
  await page.route('**/audio/tracks.json', (route) => route.fulfill({json: {tracks, version: 1}}))
  await page.route('**/audio/playlist.json', (route) =>
    route.fulfill({json: {trackIds: ['first', 'second'], version: 1}}),
  )
  await page.route('**/audio/albums.json', (route) =>
    route.fulfill({
      json: {
        albums: [
          {
            description: 'Two tracks for playlist controls',
            icon: 'i-tabler-music',
            id: 'test-album',
            title: 'Test Album',
            trackIds: ['first', 'second'],
          },
        ],
        version: 1,
      },
    }),
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
    if (localStorage.getItem('pomo:focus-room-playback:v1') === null) {
      localStorage.setItem(
        'pomo:focus-room-playback:v1',
        JSON.stringify({
          isPlaying: false,
          positionSeconds: 0,
          savedAt: 1788912000000,
          trackId: 'first',
        }),
      )
    }
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
  const player = page.locator('.pomo-player-stage')
  await player.getByRole('button', {exact: true, name: '플레이어 펼치기'}).click()
  const queue = player.locator('.pomo-player__playlist')
  await expect(queue.getByRole('button')).toHaveText([
    '1First TrackE2E Artist',
    '2Second TrackE2E Artist',
  ])
  const albumTrigger = player.getByRole('button', {exact: true, name: '앨범 추가'})
  await albumTrigger.click()
  const album = page.getByRole('dialog', {exact: true, name: '앨범'})
  await expect(album.getByText('Test Album', {exact: true})).toBeVisible()
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  const clear = album.getByRole('button', {exact: true, name: '재생목록 모두 비우기'})
  await clear.click()
  await expect(album.getByRole('status')).toHaveText('재생목록을 비웠어요되돌리기')
  await expect(queue).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '{}').trackIds,
      ),
    )
    .toEqual([])
  await capturePlaylist(page, information, 'playlist-cleared-dark')

  await album.getByRole('button', {exact: true, name: '되돌리기'}).click()
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '{}').trackIds,
      ),
    )
    .toEqual(['first', 'second'])
  await album.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.runFor(200)
  await expect(album).not.toBeVisible()
  await expect(queue.getByRole('button')).toHaveText([
    '1First TrackE2E Artist',
    '2Second TrackE2E Artist',
  ])
  await albumTrigger.click()
  await clear.click()
  await album.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.clock.runFor(200)
  await expect(album).not.toBeVisible()
  await expect(albumTrigger).toBeFocused()
  await expect(player.getByRole('button', {exact: true, name: '이전 곡'})).toBeDisabled()
  await expect(player.getByRole('button', {exact: true, name: '다음 곡'})).toBeDisabled()
  await expect(player.locator('media-play-button:visible')).toHaveAttribute('disabled', '')
  await capturePlaylist(page, information, 'playlist-empty-dark')

  await page.clock.resume()
  await page.reload()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await player.getByRole('button', {exact: true, name: '플레이어 펼치기'}).click()
  await expect(queue).toHaveCount(0)
  await expect(player.getByText('집중 음악을 준비 중이에요', {exact: true})).toBeVisible()
  await expect(player.getByRole('button', {exact: true, name: '다음 곡'})).toBeDisabled()
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('pomo:focus-room-playlist:v1') ?? '{}').trackIds,
      ),
    )
    .toEqual([])
})
