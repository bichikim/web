/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createTestBroadcastChannel} from 'src/__tests__/create-test-broadcast-channel'
import {createEventActionRunner} from '../../../features/focus-room-dialogue/use-p-event-controller/event-action-runner'
import {usePEvents} from '../../../features/focus-room-dialogue/event-context'
import {createDesktopMusicActionInbox} from '../../../features/desktop-mode/desktop-music-actions'
import {loadSoundEffects} from '../../../features/sound-effects/load-sound-effects'
import {useSoundEffectPlayback} from '../../../features/sound-effects/use-sound-effect'
import {SoundEffectsProvider} from '../../../features/sound-effects/SoundEffectsProvider'
import {DesktopWallpaperEventActionBridge} from '../DesktopWallpaperEventActionBridge'

vi.mock('../../../features/focus-room-dialogue/event-context', () => ({usePEvents: vi.fn()}))
vi.mock('../../../features/sound-effects/load-sound-effects', () => ({
  loadSoundEffects: vi.fn(),
}))
vi.mock('../../../features/sound-effects/use-sound-effect', () => ({
  useSoundEffectPlayback: vi.fn(),
}))

const effect = {
  artworkUrl: '/rain.png',
  durationSeconds: 10,
  id: 'rain',
  source: '/rain.mp3',
  title: {en: 'Rain', ko: '비'},
}
const TestChannel = createTestBroadcastChannel({broadcast: true, removeOnClose: true})
const activate = vi.fn()
const stop = vi.fn()
let runner: ReturnType<typeof createEventActionRunner>
let catalog: ReturnType<typeof Promise.withResolvers<(typeof effect)[]>>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  TestChannel.instances = []
  vi.stubGlobal('BroadcastChannel', TestChannel)
  catalog = Promise.withResolvers<(typeof effect)[]>()
  vi.mocked(loadSoundEffects).mockReturnValue(catalog.promise)
  vi.mocked(useSoundEffectPlayback).mockReturnValue({
    activate,
    error: () => null,
    playing: () => false,
    ready: () => true,
    setVolume: vi.fn(),
    stop,
    volume: () => 0.4,
  })
  runner = createEventActionRunner(() => ({
    'break-start': ['music-start', 'music-stop'],
    'focus-end': ['sound-effects-stop'],
    'focus-start': ['sound-effects-start'],
  }))
  vi.mocked(usePEvents).mockReturnValue({
    registerEventActionExecutor: runner.register,
    registerEventActionHandler: runner.registerHandler,
  } as ReturnType<typeof usePEvents>)
})
afterEach(() => {
  cleanup()
  runner.dispose()
  localStorage.clear()
  vi.unstubAllGlobals()
})

const mountBridge = () =>
  render(() => (
    <SoundEffectsProvider>
      <DesktopWallpaperEventActionBridge />
    </SoundEffectsProvider>
  ))
const ready = async () => {
  catalog.resolve([effect])
  await catalog.promise
  await Promise.resolve()
}

it('should execute a real runner sound action through the home-owned controller', async () => {
  mountBridge()
  await ready()
  runner.run(['focus-start'])
  expect(activate).toHaveBeenCalledOnce()
  runner.run(['focus-end'])
  expect(stop).toHaveBeenCalledOnce()
})

it('should drain pre-mount and loading actions in order once without replaying on player readiness', async () => {
  runner.run(['focus-start'])
  mountBridge()
  runner.run(['focus-end', 'focus-start'])
  expect(activate).not.toHaveBeenCalled()
  await ready()
  expect(activate).toHaveBeenCalledOnce()
  expect(stop).toHaveBeenCalledOnce()
  expect(activate.mock.invocationCallOrder[0]).toBeLessThan(stop.mock.invocationCallOrder[0]!)
  TestChannel.instances[0]?.dispatch({type: 'player-ready'})
  expect(activate).toHaveBeenCalledOnce()
})

it('should preserve restored all-off state even for a start queued before catalog readiness', async () => {
  localStorage.setItem('pomo:sound-effects-stopped:v1', 'true')
  mountBridge()
  runner.run(['focus-start'])
  await ready()
  expect(activate).not.toHaveBeenCalled()
  expect(stop).toHaveBeenCalledOnce()
  expect(localStorage.getItem('pomo:sound-effects-stopped:v1')).toBe('true')
})

it('should execute local sound actions without BroadcastChannel support', async () => {
  vi.stubGlobal('BroadcastChannel', undefined)
  mountBridge()
  await ready()
  runner.run(['focus-start'])
  expect(activate).toHaveBeenCalledOnce()
})

it('should preserve queued music order through the actual receiver readiness handshake', async () => {
  mountBridge()
  runner.run(['break-start'])
  const inbox = createDesktopMusicActionInbox()
  const receive = vi.fn()
  const unsubscribe = inbox.subscribe(receive)
  expect(receive.mock.calls).toEqual([['music-start'], ['music-stop']])
  await ready()
  runner.run(['focus-start'])
  expect(receive).toHaveBeenCalledTimes(2)
  expect(activate).toHaveBeenCalledOnce()
  unsubscribe()
  inbox.close()
})

it('should release handlers and the channel without executing later events', async () => {
  const view = mountBridge()
  await ready()
  const channel = TestChannel.instances[0]!
  view.unmount()
  expect(channel.close).toHaveBeenCalledOnce()
  expect(channel.listeners).toHaveLength(0)
  runner.run(['focus-start'])
  expect(activate).not.toHaveBeenCalled()
  const execute = vi.fn()
  const unregister = runner.register(execute)
  expect(execute).toHaveBeenCalledExactlyOnceWith('sound-effects-start')
  unregister()
})

it('should leave sound actions available to the next executor when the provider is absent', () => {
  const view = render(() => <DesktopWallpaperEventActionBridge />)
  runner.run(['focus-start', 'focus-end'])
  view.unmount()
  const execute = vi.fn()
  const unregister = runner.register(execute)
  expect(execute.mock.calls).toEqual([['sound-effects-start'], ['sound-effects-stop']])
  unregister()
})

it('should not drain a loading queue after the bridge is disposed', async () => {
  const view = mountBridge()
  runner.run(['focus-start'])
  view.unmount()
  await ready()
  expect(activate).not.toHaveBeenCalled()
  const execute = vi.fn()
  const unregister = runner.register(execute)
  expect(execute).toHaveBeenCalledExactlyOnceWith('sound-effects-start')
  unregister()
})

it('should preserve a queued stop preference when catalog loading fails', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    mountBridge()
    runner.run(['focus-end'])
    catalog.reject(new Error('catalog unavailable'))
    await catalog.promise.catch(() => undefined)
    await Promise.resolve()
    expect(localStorage.getItem('pomo:sound-effects-stopped:v1')).toBe('true')
    expect(activate).not.toHaveBeenCalled()
  } finally {
    warn.mockRestore()
  }
})
