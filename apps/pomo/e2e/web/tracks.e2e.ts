import {expect, test} from '@playwright/test'

const FIXTURE_ORIGIN = 'http://127.0.0.1:44175'
const SAMPLE_RATE = 8_000
const DURATION_SECONDS = 30
const WAV_HEADER_BYTES = 44
const PCM_SAMPLE_BYTES = 2

const createSilentAudio = () => {
  const dataLength = SAMPLE_RATE * DURATION_SECONDS * PCM_SAMPLE_BYTES
  const buffer = Buffer.alloc(WAV_HEADER_BYTES + dataLength)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * PCM_SAMPLE_BYTES, 28)
  buffer.writeUInt16LE(PCM_SAMPLE_BYTES, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40)
  return buffer
}

test('preserves real preview audio and playback position across catalog object replacement', async ({
  page,
}) => {
  await page.route(`${FIXTURE_ORIGIN}/api/admin/music`, (route) =>
    route.fulfill({json: {albums: [], assets: [], offers: [], pendingTracks: [], tracks: []}}),
  )
  await page.route(`${FIXTURE_ORIGIN}/api/admin/music/tracks/*/playback`, (route) =>
    route.fulfill({
      json: {expiresAt: '2099-01-01T00:00:00.000Z', url: `${FIXTURE_ORIGIN}/preview.wav`},
    }),
  )
  const audioBytes = createSilentAudio()
  await page.route(`${FIXTURE_ORIGIN}/preview.wav`, (route) => {
    const range = /^bytes=(\d+)-(\d*)$/u.exec(route.request().headers().range ?? '')
    const start = range === null ? 0 : Number(range[1])
    const end = range?.[2] ? Number(range[2]) : audioBytes.length - 1
    return route.fulfill({
      body: audioBytes.subarray(start, end + 1),
      contentType: 'audio/wav',
      headers: {
        'Accept-Ranges': 'bytes',
        ...(range === null ? {} : {'Content-Range': `bytes ${start}-${end}/${audioBytes.length}`}),
      },
      status: range === null ? 200 : 206,
    })
  })
  await page.goto(`${FIXTURE_ORIGIN}/tracks`)
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true')
  await page.getByRole('button', {exact: true, name: 'Original track 미리 듣기'}).click()
  const audio = page.locator('audio')
  await expect(audio).toHaveCount(1)
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.readyState))
    .toBeGreaterThanOrEqual(4)
  const original = await audio.elementHandle()
  await audio.evaluate((element: HTMLAudioElement) => {
    element.pause()
    element.currentTime = 12
  })
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBe(12)
  await page.getByRole('button', {name: 'Refresh tracks'}).click()
  await expect(page.getByRole('button', {name: 'Updated track 수록곡 삭제'})).toBeVisible()
  expect(await original!.evaluate((element) => element === document.querySelector('audio'))).toBe(
    true,
  )
  expect(await audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(12)
  await page.getByRole('button', {name: 'Remove tracks'}).click()
  await expect(audio).toHaveCount(0)
})
