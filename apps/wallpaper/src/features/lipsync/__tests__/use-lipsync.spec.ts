/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {Player} from '@winter-love/puppet/player'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {type LipSyncFrame, subscribeLipSync} from '../channel'
import {useLipSync} from '../use-lipsync'

vi.mock('../channel', () => ({subscribeLipSync: vi.fn()}))
let frames: FrameRequestCallback[] = []
const draw = () => {
  const pending = frames
  frames = []
  pending.forEach((callback) => callback(0))
}
beforeEach(() => {
  frames = []
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
it('should apply only the configured input and release only its own override when disabled or rebound', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  const stop = vi.fn()
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return stop
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  const [settings, setSettings] = createSignal<PoffoLipSync>({source: 'voice'})
  const hook = renderHook(() =>
    useLipSync({
      options: settings,
      parameters: () => [{defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
      widgetId: () => 'widget',
    }),
  )
  await Promise.resolve()
  receive({level: 0.8, source: 'speech', widgetId: 'widget'})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-open': 0})
  receive({level: 0.8, source: 'voice', widgetId: 'widget'})
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-open': 0.8})
  setSettings({...settings()})
  expect(stop).not.toHaveBeenCalled()
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
  setSettings({source: 'off'})
  expect(player.clearParameterValues).toHaveBeenLastCalledWith(['mouth-open'])
  expect(stop).toHaveBeenCalledOnce()
  receive({level: 1, source: 'voice', widgetId: 'widget'})
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
  hook.cleanup()
})

it('should apply only the latest received opening per painted frame and ignore repeated levels', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return vi.fn(() => undefined)
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  renderHook(() =>
    useLipSync({
      options: () => ({source: 'voice'}),
      parameters: () => [{defaultValue: 0, id: 'mouth-open', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
      widgetId: () => 'widget',
    }),
  )
  await Promise.resolve()
  for (const level of [0.2, 0.6, 0.8]) {
    receive({level, source: 'voice', widgetId: 'widget'})
  }
  expect(player.patchParameterValues).toHaveBeenCalledOnce()
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-open': 0.8})
  receive({level: 0.8, source: 'voice', widgetId: 'widget'})
  draw()
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
})
