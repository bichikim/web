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
      parameters: () => [{defaultValue: 0, id: 'mouth-a', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
      widgetId: () => 'widget',
    }),
  )
  await Promise.resolve()
  receive({level: 0.8, shape: 'a', source: 'speech', widgetId: 'widget'})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-a': 0})
  receive({level: 0.8, shape: 'a', source: 'voice', widgetId: 'widget'})
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-a': 0.8})
  setSettings({...settings()})
  expect(stop).not.toHaveBeenCalled()
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
  setSettings({source: 'off'})
  expect(player.clearParameterValues).toHaveBeenLastCalledWith(['mouth-a'])
  expect(stop).toHaveBeenCalledOnce()
  receive({level: 1, shape: 'a', source: 'voice', widgetId: 'widget'})
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
  hook.cleanup()
})

it('should apply only the latest received pose per painted frame and ignore repeated levels', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return vi.fn(() => undefined)
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  renderHook(() =>
    useLipSync({
      options: () => ({source: 'voice'}),
      parameters: () => [{defaultValue: 0, id: 'mouth-a', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
      widgetId: () => 'widget',
    }),
  )
  await Promise.resolve()
  for (const level of [0.2, 0.6, 0.8]) {
    receive({level, shape: 'a', source: 'voice', widgetId: 'widget'})
  }
  expect(player.patchParameterValues).toHaveBeenCalledOnce()
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({'mouth-a': 0.8})
  receive({level: 0.8, shape: 'a', source: 'voice', widgetId: 'widget'})
  draw()
  expect(player.patchParameterValues).toHaveBeenCalledTimes(2)
})

it('should switch independent vowels, reset the preceding pose and ignore legacy opening-only frames', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return vi.fn(() => undefined)
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  renderHook(() =>
    useLipSync({
      options: () => ({source: 'voice'}),
      parameters: () =>
        ['a', 'i', 'u', 'e', 'o'].map((shape) => ({
          defaultValue: 0,
          id: `mouth-${shape}`,
          maximum: 1,
          minimum: 0,
        })),
      player: () => player as unknown as Player,
      widgetId: () => 'widget',
    }),
  )
  await Promise.resolve()
  for (const shape of ['a', 'i', 'u', 'e', 'o'] as const) {
    receive({level: 1, shape, source: 'voice', widgetId: 'widget'})
    draw()
    expect(player.patchParameterValues).toHaveBeenLastCalledWith(
      Object.fromEntries(
        ['a', 'i', 'u', 'e', 'o'].map((value) => [`mouth-${value}`, value === shape ? 1 : 0]),
      ),
    )
  }
  receive({level: 1, source: 'voice', widgetId: 'widget'})
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    'mouth-a': 0,
    'mouth-e': 0,
    'mouth-i': 0,
    'mouth-o': 0,
    'mouth-u': 0,
  })
})

it('should connect Ash open and form parameters automatically with the landing vowel poses', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return vi.fn(() => undefined)
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  const hook = renderHook(() =>
    useLipSync({
      options: () => ({source: 'voice'}),
      parameters: () => [
        {defaultValue: 0, id: 'ParamMouthOpenY', maximum: 1, minimum: 0},
        {defaultValue: 0, id: 'ParamMouthForm', maximum: 1, minimum: -1},
      ],
      player: () => player as unknown as Player,
      widgetId: () => 'ash',
    }),
  )
  await Promise.resolve()
  const poses = [
    {form: 0.2, open: 0.9, shape: 'a'},
    {form: 1, open: 0.55, shape: 'i'},
    {form: -1, open: 0.25, shape: 'u'},
    {form: 0.5, open: 0.65, shape: 'e'},
    {form: -1, open: 0.65, shape: 'o'},
    {form: 0, open: 0, shape: 'closed'},
  ] as const
  for (const pose of poses) {
    receive({level: 1, shape: pose.shape, source: 'voice', widgetId: 'ash'})
    draw()
    expect(player.patchParameterValues).toHaveBeenLastCalledWith({
      ParamMouthForm: pose.form,
      ParamMouthOpenY: pose.open,
    })
  }
  receive({level: 0, shape: 'o', source: 'voice', widgetId: 'ash'})
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    ParamMouthForm: 0,
    ParamMouthOpenY: 0,
  })
  hook.cleanup()
  expect(player.clearParameterValues).toHaveBeenCalledWith(['ParamMouthOpenY', 'ParamMouthForm'])
})

it('should blend acoustic poses while preserving manual connections and explicit disabled shapes', async () => {
  let receive: (frame: LipSyncFrame) => void = () => undefined
  vi.mocked(subscribeLipSync).mockImplementation(async (_, callback) => {
    receive = callback
    return vi.fn(() => undefined)
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  const [options, setOptions] = createSignal<PoffoLipSync>({source: 'voice'})
  const hook = renderHook(() =>
    useLipSync({
      options,
      parameters: () => [
        {defaultValue: 0, id: 'ParamMouthOpenY', maximum: 1, minimum: 0},
        {defaultValue: 0, id: 'ParamMouthForm', maximum: 1, minimum: -1},
        {defaultValue: 0, id: 'manual-a', maximum: 1, minimum: 0},
      ],
      player: () => player as unknown as Player,
      widgetId: () => 'blend',
    }),
  )
  await Promise.resolve()
  const frame: LipSyncFrame = {
    level: 1,
    shape: 'a',
    source: 'voice',
    weights: {a: 0.5, o: 0.5},
    widgetId: 'blend',
  }
  receive(frame)
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    ParamMouthForm: -0.4,
    ParamMouthOpenY: 0.775,
  })
  setOptions({shapes: {a: {parameterId: 'manual-a'}, o: {parameterId: null}}, source: 'voice'})
  await Promise.resolve()
  receive(frame)
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    'manual-a': 0.5,
    ParamMouthForm: 0,
    ParamMouthOpenY: 0,
  })
  setOptions({
    shapes: {e: {parameterId: 'manual-a'}, i: {parameterId: 'manual-a'}},
    source: 'voice',
  })
  await Promise.resolve()
  receive({...frame, shape: 'i', weights: {e: 0.5, i: 0.5}})
  draw()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({
    'manual-a': 1,
    ParamMouthForm: 0,
    ParamMouthOpenY: 0,
  })
  hook.cleanup()
})
