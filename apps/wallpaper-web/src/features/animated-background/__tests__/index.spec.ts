/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createPlayer, preparePuppetDocument} from '@winter-love/puppet/player'
import {useAnimatedBackground} from '..'

const player = vi.hoisted(() => ({
  destroy: vi.fn(),
  pause: vi.fn(),
  resize: vi.fn(),
  resume: vi.fn(),
  setViewCamera: vi.fn(),
}))
vi.mock('@winter-love/puppet/player', () => ({
  createPlayer: vi.fn(async () => player),
  preparePuppetDocument: vi.fn(async () => ({
    document: {viewport: {height: 900, width: 1600}},
    ok: true,
  })),
}))

const media = {addEventListener: vi.fn(), matches: false, removeEventListener: vi.fn()}
beforeEach(() => {
  media.matches = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}')),
  )
  vi.stubGlobal('devicePixelRatio', 1)
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn().mockImplementation(function observer() {
      return {disconnect: vi.fn(), observe: vi.fn()}
    }),
  )
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should pause a retained background without fetching or preparing its scene again', async () => {
  const source = new Blob(['{}'])
  const response = new Response('{}')
  const text = vi.spyOn(response, 'text')
  vi.spyOn(response, 'blob').mockResolvedValue(source)
  vi.mocked(fetch).mockResolvedValueOnce(response)
  const host = document.createElement('div')
  Object.defineProperties(host, {clientHeight: {value: 900}, clientWidth: {value: 1200}})
  const canvas = document.createElement('canvas')
  host.append(canvas)
  const [playing, setPlaying] = createSignal(true)
  const hook = renderHook(() =>
    useAnimatedBackground({
      canvas: () => canvas,
      host: () => host,
      playing,
      source: () => '/scene.json',
    }),
  )
  await waitFor(() => expect(player.resume).toHaveBeenCalledOnce(), {interval: 1})
  vi.mocked(createPlayer).mock.calls[0]![0].onAfterRender?.()
  expect(hook.result.ready()).toBe(true)
  setPlaying(false)
  expect(player.pause).toHaveBeenCalledOnce()
  setPlaying(true)
  expect(player.resume).toHaveBeenCalledTimes(2)
  expect(fetch).toHaveBeenCalledOnce()
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledWith(expect.objectContaining({source}))
  expect(text).not.toHaveBeenCalled()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledOnce()
  expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
})
