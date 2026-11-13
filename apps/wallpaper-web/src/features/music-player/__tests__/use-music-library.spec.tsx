/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {useMusicLibrary} from '../use-music-library'

const Library = () => {
  const library = useMusicLibrary()
  return (
    <button type="button" onClick={library.retry}>
      {library.status()}
    </button>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('should load the public catalog when the player mounts', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({albums: [], version: 1})))
  vi.stubGlobal('fetch', fetch)
  render(() => <Library />)
  expect((await screen.findByRole('button', {name: 'ready'})).textContent).toBe('ready')
  expect(fetch).toHaveBeenCalledWith('/music/library.json', {
    cache: 'no-store',
    signal: expect.any(AbortSignal),
  })
})

test('should let the user retry a failed catalog request', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('', {status: 503}))
    .mockResolvedValueOnce(new Response(JSON.stringify({albums: [], version: 1})))
  vi.stubGlobal('fetch', fetch)
  render(() => <Library />)
  fireEvent.click(await screen.findByRole('button', {name: 'error'}))
  expect((await screen.findByRole('button', {name: 'ready'})).textContent).toBe('ready')
})
