/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  createDemoDocument,
  createPlayer,
  type Player,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import {SAMPLE_PUPPET_ID} from '../constants'
import {usePuppet} from '../use-puppet'
import type {PoffoTracking} from '@winter-love/wallpaper/settings/tracking'

vi.mock('@winter-love/puppet/player', () => ({
  createDemoDocument: vi.fn(),
  createPlayer: vi.fn(),
  preparePuppetDocument: vi.fn(),
}))

const player: Player = {
  clearParameterValues: vi.fn(),
  configureRenderer: vi.fn(),
  destroy: vi.fn(),
  getExpression: vi.fn(),
  getParameterValue: vi.fn(),
  getParameterValues: vi.fn(),
  getRenderingInfo: vi.fn(),
  hitTest: vi.fn(),
  patchParameterBlends: vi.fn(),
  patchParameterValues: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playGroup: vi.fn(),
  playMotion: vi.fn(),
  redraw: vi.fn(),
  resetMotionHistory: vi.fn(),
  resetParameters: vi.fn(),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  setBreath: vi.fn(),
  setExpression: vi.fn(),
  setEyeBlink: vi.fn(),
  setEyeBlinkTiming: vi.fn(),
  setGroupOverride: vi.fn(),
  setLipSync: vi.fn(),
  setLookTarget: vi.fn(),
  setModelOpacity: vi.fn(),
  setMotion: vi.fn(),
  setParameterBlend: vi.fn(),
  setParameterValue: vi.fn(),
  setParameterValues: vi.fn(),
  setPartOverride: vi.fn(),
  setPhysicsOptions: vi.fn(),
  setPhysicsPreview: vi.fn(),
  setPlaybackSpeed: vi.fn(),
  setViewCamera: vi.fn(),
  setVowelWeights: vi.fn(),
  startMotion: vi.fn(),
  stop: vi.fn(),
  updateDocument: vi.fn(),
}

const actual = await vi.importActual<typeof import('@winter-love/puppet/player')>(
  '@winter-love/puppet/player',
)
const sample = actual.createDemoDocument()
const prepared = await actual.preparePuppetDocument({document: sample})

beforeEach(() => {
  vi.mocked(createDemoDocument).mockReturnValue(sample)
  vi.mocked(preparePuppetDocument).mockResolvedValue(prepared)
  vi.mocked(createPlayer).mockResolvedValue(player)
  vi.mocked(player.playMotion).mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('should resize the existing player when its container changes and stop observing on unmount', async () => {
  const observer = {disconnect: vi.fn(), observe: vi.fn(), unobserve: vi.fn()}
  let notify: () => void = () => undefined
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(function observeResize(callback: ResizeObserverCallback) {
      notify = () => callback([], observer)
      return observer
    }),
  )
  const container = document.createElement('div')
  const canvas = document.createElement('canvas')
  container.append(canvas)
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(player.play).toHaveBeenCalledOnce())
  expect(observer.observe).toHaveBeenCalledExactlyOnceWith(container)
  notify()
  expect(player.resize).toHaveBeenCalledOnce()
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(player.destroy).not.toHaveBeenCalled()
  hook.cleanup()
  expect(observer.disconnect).toHaveBeenCalledOnce()
  expect(player.destroy).toHaveBeenCalledOnce()
})

it('should preserve a player when refreshed settings retain the same asset', async () => {
  const [content, setContent] = createSignal({assetId: SAMPLE_PUPPET_ID, revision: 0})
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => content().assetId,
      canvas: () => canvas,
      load: vi.fn(async () => ''),
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(createPlayer).toHaveBeenCalledOnce())
  setContent({assetId: SAMPLE_PUPPET_ID, revision: 1})
  expect(player.destroy).not.toHaveBeenCalled()
  expect(createPlayer).toHaveBeenCalledOnce()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledOnce()
})

it('should change motions and disable them without preparing or replacing the player', async () => {
  const [motionId, setMotionId] = createSignal<string | null | undefined>()
  const canvas = document.createElement('canvas')
  const onMotions = vi.fn()
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      load: vi.fn(),
      motionId,
      onError: vi.fn(),
      onMotions,
    }),
  )
  await waitFor(() => expect(player.playMotion).toHaveBeenCalledWith('idle-deform', {loop: true}))
  expect(onMotions).toHaveBeenLastCalledWith(sample.motions.map((motion) => motion.id))
  setMotionId('wave')
  expect(player.playMotion).toHaveBeenLastCalledWith('wave', {loop: true})
  setMotionId(null)
  expect(player.stop).toHaveBeenCalledOnce()
  setMotionId(undefined)
  expect(player.playMotion).toHaveBeenLastCalledWith('idle-deform', {loop: true})
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledOnce()
  expect(player.destroy).not.toHaveBeenCalled()
  hook.cleanup()
})

it('should not restart animation when another widget preference changes', async () => {
  const [settings, setSettings] = createSignal({motionId: 'wave', revision: 0})
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      load: vi.fn(),
      motionId: () => settings().motionId,
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(player.playMotion).toHaveBeenCalledOnce())
  setSettings({motionId: 'wave', revision: 1})
  expect(player.playMotion).toHaveBeenCalledOnce()
  hook.cleanup()
})

it('should stop playback for an unavailable saved motion instead of silently playing the first', async () => {
  vi.mocked(player.playMotion).mockReturnValue(false)
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      load: vi.fn(),
      motionId: () => 'removed',
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(player.stop).toHaveBeenCalledOnce())
  expect(player.playMotion).toHaveBeenCalledExactlyOnceWith('removed', {loop: true})
  hook.cleanup()
})

it('should switch tracking inputs without preparing the model or recreating its player', async () => {
  const [tracking, setTracking] = createSignal<PoffoTracking>('off')
  const canvas = document.createElement('canvas')
  const load = vi.fn(async () => 'character-source')
  const error = vi.fn()
  const hook = renderHook(() =>
    usePuppet({assetId: () => 'character', canvas: () => canvas, load, onError: error, tracking}),
  )
  await waitFor(() => expect(player.play).toHaveBeenCalledOnce())
  setTracking('cursor')
  setTracking('camera')
  setTracking('off')
  setTracking('cursor')
  await Promise.resolve()
  expect(load).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledOnce()
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(player.destroy).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledOnce()
})

it('should replace a player when the selected asset changes and release it on unmount', async () => {
  const imported = await actual.preparePuppetDocument({document: actual.createDemoDocument()})
  vi.mocked(preparePuppetDocument).mockResolvedValueOnce(prepared).mockResolvedValueOnce(imported)
  const [assetId, setAssetId] = createSignal<string>(SAMPLE_PUPPET_ID)
  const canvas = document.createElement('canvas')
  const load = vi.fn(async () => '{}')
  const hook = renderHook(() => usePuppet({assetId, canvas: () => canvas, load, onError: vi.fn()}))
  await waitFor(() => expect(player.play).toHaveBeenCalledOnce())
  setAssetId('imported')
  await waitFor(() => expect(player.play).toHaveBeenCalledTimes(2))
  expect(load).toHaveBeenCalledWith('imported')
  expect(player.destroy).toHaveBeenCalledOnce()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledTimes(2)
})

it('should retain the player for separately imported copies and switch back without loading again', async () => {
  const [assetId, setAssetId] = createSignal('first')
  const load = vi.fn(async () => 'same-character-source')
  const canvas = document.createElement('canvas')
  const hook = renderHook(() => usePuppet({assetId, canvas: () => canvas, load, onError: vi.fn()}))
  await waitFor(() => expect(player.play).toHaveBeenCalledOnce())
  setAssetId('second')
  await waitFor(() => expect(load).toHaveBeenCalledWith('second'))
  await Promise.resolve()
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledOnce()
  setAssetId('first')
  await Promise.resolve()
  expect(load).toHaveBeenCalledTimes(2)
  expect(player.destroy).not.toHaveBeenCalled()
  hook.cleanup()
  expect(player.destroy).toHaveBeenCalledOnce()
})

it('should keep the current player during loading and ignore a superseded selection', async () => {
  let resolveSource: (source: string) => void = () => undefined
  const completion = new Promise<string>((resolve) => {
    resolveSource = resolve
  })
  const load = vi.fn(async (id: string) => (id === 'slow' ? completion : 'ready-character'))
  const [assetId, setAssetId] = createSignal('first')
  const canvas = document.createElement('canvas')
  const error = vi.fn()
  const hook = renderHook(() => usePuppet({assetId, canvas: () => canvas, load, onError: error}))
  await waitFor(() => expect(player.play).toHaveBeenCalledOnce())
  setAssetId('slow')
  await waitFor(() => expect(load).toHaveBeenCalledWith('slow'))
  expect(player.destroy).not.toHaveBeenCalled()
  setAssetId('first')
  resolveSource('superseded-character')
  await completion
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
  hook.cleanup()
})
