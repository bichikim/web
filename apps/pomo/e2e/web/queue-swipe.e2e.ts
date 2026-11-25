import {fileURLToPath} from 'node:url'
import {expect, test} from '@playwright/test'

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

test('announces an English queue swipe and removes the track upon release', async ({
  baseURL,
  context,
  page,
}) => {
  if (baseURL === undefined) {
    throw new Error('The Pomo web project must define its base URL')
  }

  await context.addCookies([{name: 'PARAGLIDE_LOCALE', url: baseURL, value: 'en'}])
  await page.route('**/audio/tracks.json', (route) => route.fulfill({json: {tracks, version: 1}}))
  await page.route('**/audio/playlist.json', (route) =>
    route.fulfill({json: {trackIds: ['first', 'second'], version: 1}}),
  )
  await page.route('**/audio/e2e-silence.wav', (route) =>
    route.fulfill({
      contentType: 'audio/wav',
      path: fileURLToPath(new URL('../fixtures/playlist/silence.wav', import.meta.url)),
    }),
  )

  await page.goto('/')
  await page.getByRole('button', {exact: true, name: 'Start'}).click()
  await page.getByRole('button', {exact: true, name: 'Expand player'}).click()

  const track = page.getByRole('button', {name: 'First Track · E2E Artist · Swipe to delete'})
  await expect(track).toBeVisible()
  const bounds = await track.boundingBox()
  if (bounds === null) {
    throw new Error('The queue track must have a rendered bounding box')
  }

  const startX = bounds.x + bounds.width / 2
  const startY = bounds.y + bounds.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  try {
    await page.mouse.move(startX + 64, startY)
    await expect(page.getByText('First Track, release to delete')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  } finally {
    await page.mouse.up()
  }
  await expect(track).toHaveCount(0)
  await expect(
    page.getByRole('button', {name: 'Second Track · E2E Artist · Swipe to delete'}),
  ).toBeVisible()
})
