/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  configurePlayerBuffering,
  createDemoDocument,
  createPlayer,
  flushPlayerInputs,
  type Player,
  type PlayerInputChange,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import {createNativePlayer} from '@winter-love/puppet/native'
import {SAMPLE_PUPPET_ID} from '../constants'
import {usePuppet} from '../use-puppet'
import type {PoffoTracking} from '@winter-love/wallpaper/settings/tracking'
import {createNativeWidgetBackend} from '../../native-widget'

vi.mock('@winter-love/puppet/player', () => ({
  configurePlayerBuffering: vi.fn(),
  createDemoDocument: vi.fn(),
  createPlayer: vi.fn(),
  flushPlayerInputs: vi.fn(),
  preparePuppetDocument: vi.fn(),
}))
vi.mock('@winter-love/puppet/native', () => ({createNativePlayer: vi.fn()}))
vi.mock('../../native-widget', () => ({
  createNativeWidgetBackend: vi.fn().mockResolvedValue(undefined),
}))

const player: Player = {
  clearParameterValues: vi.fn(),
  configureRenderer: vi.fn(),
  createParameterDrag: vi.fn(),
  destroy: vi.fn(),
  getExpression: vi.fn(),
  getParameterValue: vi.fn(),
  getParameterValues: vi.fn(),
  getRenderingInfo: vi.fn(),
  hitTest: vi.fn(),
  patchParameterBlends: vi.fn(),
  patchParameterValues: vi.fn(),
  pause: vi.fn(),
  pickPart: vi.fn(),
  play: vi.fn(),
  playGroup: vi.fn(),
  playMotion: vi.fn(),
  redraw: vi.fn(),
  releaseParameterPhysics: vi.fn(() => []),
  resetMotionHistory: vi.fn(),
  resetParameters: vi.fn(),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  setBreath: vi.fn(),
  setExpression: vi.fn(),
  setExpressionLayer: vi.fn(),
  setExpressions: vi.fn(),
  setEyeBlink: vi.fn(),
  setEyeBlinkTiming: vi.fn(),
  setFit: vi.fn(),
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
  vi.mocked(configurePlayerBuffering).mockResolvedValue('applied')
  vi.mocked(createDemoDocument).mockReturnValue(sample)
  vi.mocked(preparePuppetDocument).mockResolvedValue(prepared)
  vi.mocked(createPlayer).mockResolvedValue(player)
  vi.mocked(createNativePlayer).mockResolvedValue(player)
  vi.mocked(flushPlayerInputs).mockResolvedValue('applied')
  vi.mocked(player.playMotion).mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should remain hidden through player creation until the configured first frame is submitted', async () => {
  const submitted = Promise.withResolvers<PlayerInputChange>()
  const started = Promise.withResolvers<void>()
  vi.mocked(flushPlayerInputs).mockImplementationOnce(() => {
    started.resolve()
    return submitted.promise
  })
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => document.createElement('canvas'),
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  expect(hook.result.ready()).toBe(false)
  await started.promise
  expect(player.playMotion).toHaveBeenCalled()
  expect(createPlayer).toHaveBeenCalledWith(
    expect.objectContaining({buffering: true, gpuPresentation: 'auto', renderer: 'wgpu'}),
  )
  vi.mocked(createPlayer).mock.calls[0]![0].onAfterRender?.()
  expect(hook.result.ready()).toBe(false)
  submitted.resolve('applied')
  await submitted.promise
  expect(hook.result.ready()).toBe(true)
  expect(configurePlayerBuffering).not.toHaveBeenCalled()
  hook.cleanup()
})

it('should retry WebKit bitmap presentation on a fresh canvas if Worker Canvas fails', async () => {
  vi.stubGlobal('isTauri', true)
  vi.stubGlobal('webkit', {})
  const transferred = Object.assign(document.createElement('canvas'), {
    transferControlToOffscreen: vi.fn(),
  })
  const replacement = document.createElement('canvas')
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>(transferred)
  const started = Promise.withResolvers<void>()
  const initialization = Promise.withResolvers<Player>()
  const onError = vi.fn()
  vi.mocked(createPlayer).mockImplementationOnce(() => {
    started.resolve()
    return initialization.promise
  })
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas,
      load: vi.fn(),
      nativeSurface: true,
      onError,
    }),
  )
  await started.promise
  const firstKey = hook.result.canvasKey()
  expect(createPlayer).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({canvas: transferred, gpuPresentation: 'worker-canvas'}),
  )
  initialization.reject(new Error('Worker Canvas unavailable'))
  await waitFor(() => expect(hook.result.canvasKey()).not.toBe(firstKey))
  setCanvas(replacement)
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  expect(createPlayer).toHaveBeenLastCalledWith(
    expect.objectContaining({canvas: replacement, gpuPresentation: 'animation-frame'}),
  )
  expect(onError).not.toHaveBeenCalled()
})

it('should use the DirectX backend reported by the Windows widget host', async () => {
  vi.stubGlobal('isTauri', true)
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')
  const backend = {kind: 'dx12' as const, open: vi.fn()}
  vi.mocked(createNativeWidgetBackend).mockResolvedValueOnce(backend)
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => document.createElement('canvas'),
      load: vi.fn(),
      nativeSurface: true,
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  expect(createNativePlayer).toHaveBeenCalledWith(
    expect.objectContaining({nativeBackend: backend, workerRuntime: 'rust'}),
  )
  expect(createPlayer).not.toHaveBeenCalled()
})

it('should use browser wgpu if the desktop player cannot open its surface', async () => {
  vi.stubGlobal('isTauri', true)
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.mocked(createNativeWidgetBackend).mockResolvedValueOnce({kind: 'metal', open: vi.fn()})
  vi.mocked(createNativePlayer).mockRejectedValueOnce(new Error('Metal surface unavailable'))
  const onError = vi.fn()
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      load: vi.fn(),
      nativeSurface: true,
      onError,
    }),
  )
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  expect(createPlayer).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({canvas, gpuPresentation: 'auto', renderer: 'wgpu'}),
  )
  expect(onError).not.toHaveBeenCalled()
})

it('should retry on a fresh Pixi canvas when browser wgpu fails to start', async () => {
  const original = document.createElement('canvas')
  const replacement = document.createElement('canvas')
  const [canvas, setCanvas] = createSignal(original)
  const onError = vi.fn()
  const started = Promise.withResolvers<void>()
  const initialization = Promise.withResolvers<Player>()
  vi.mocked(createPlayer).mockImplementationOnce(() => {
    started.resolve()
    return initialization.promise
  })
  const hook = renderHook(() =>
    usePuppet({assetId: () => SAMPLE_PUPPET_ID, canvas, load: vi.fn(), onError}),
  )
  await started.promise
  const firstKey = hook.result.canvasKey()
  initialization.reject(new Error('WebGPU unavailable'))
  await waitFor(() => expect(hook.result.canvasKey()).not.toBe(firstKey))
  setCanvas(replacement)
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  expect(createPlayer).toHaveBeenLastCalledWith(
    expect.objectContaining({canvas: replacement, renderer: 'pixi'}),
  )
  expect(onError).not.toHaveBeenCalled()
})

it('should submit the configured first frame before enabling buffering in an inactive window', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  const buffering = Promise.withResolvers<'applied'>()
  vi.mocked(configurePlayerBuffering).mockReturnValueOnce(buffering.promise)
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => document.createElement('canvas'),
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  expect(createPlayer).toHaveBeenCalledWith(
    expect.objectContaining({buffering: false, renderer: 'wgpu', workerRuntime: 'rust'}),
  )
  expect(configurePlayerBuffering).toHaveBeenCalledWith(player, {enabled: true})
  expect(vi.mocked(player.redraw).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(configurePlayerBuffering).mock.invocationCallOrder[0],
  )
  buffering.resolve('applied')
  hook.cleanup()
})

it('should ignore a first frame that finishes after the widget is disposed', async () => {
  const submitted = Promise.withResolvers<PlayerInputChange>()
  const started = Promise.withResolvers<void>()
  vi.mocked(flushPlayerInputs).mockImplementationOnce(() => {
    started.resolve()
    return submitted.promise
  })
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => document.createElement('canvas'),
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  await started.promise
  hook.cleanup()
  submitted.resolve('applied')
  await submitted.promise
  expect(hook.result.ready()).toBe(false)
  expect(player.redraw).not.toHaveBeenCalled()
  expect(player.destroy).toHaveBeenCalledOnce()
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
  expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({buffering: true}))
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

it('should change fitting without replacing the player or restarting its motion', async () => {
  const [fit, setFit] = createSignal<'contain' | 'cover'>('contain')
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      fit,
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  await waitFor(() => expect(player.setFit).toHaveBeenCalledWith('contain'))
  const plays = vi.mocked(player.playMotion).mock.calls.length
  setFit('cover')
  expect(player.setFit).toHaveBeenLastCalledWith('cover')
  setFit('contain')
  expect(player.setFit).toHaveBeenLastCalledWith('contain')
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(player.playMotion).toHaveBeenCalledTimes(plays)
  expect(player.destroy).not.toHaveBeenCalled()
  hook.cleanup()
})

it('should apply the latest fit when it changes during player initialization', async () => {
  const started = Promise.withResolvers<void>()
  const pending = Promise.withResolvers<Player>()
  vi.mocked(createPlayer).mockImplementationOnce(() => {
    started.resolve()
    return pending.promise
  })
  const [fit, setFit] = createSignal<'contain' | 'cover'>('cover')
  const canvas = document.createElement('canvas')
  const hook = renderHook(() =>
    usePuppet({
      assetId: () => SAMPLE_PUPPET_ID,
      canvas: () => canvas,
      fit,
      load: vi.fn(),
      onError: vi.fn(),
    }),
  )
  await started.promise
  expect(createPlayer).toHaveBeenCalledWith(expect.objectContaining({fit: 'cover'}))
  setFit('contain')
  pending.resolve(player)
  await pending.promise
  expect(player.setFit).toHaveBeenLastCalledWith('contain')
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
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  setAssetId('slow')
  expect(hook.result.ready()).toBe(false)
  await waitFor(() => expect(load).toHaveBeenCalledWith('slow'))
  expect(player.destroy).not.toHaveBeenCalled()
  setAssetId('first')
  expect(hook.result.ready()).toBe(true)
  resolveSource('superseded-character')
  await completion
  expect(createPlayer).toHaveBeenCalledOnce()
  expect(preparePuppetDocument).toHaveBeenCalledOnce()
  expect(error).not.toHaveBeenCalled()
  hook.cleanup()
})

it('should not reveal the previous character when a replacement fails to load', async () => {
  const error = vi.fn()
  const [assetId, setAssetId] = createSignal('first')
  const load = vi.fn(async (id: string) => {
    if (id === 'broken') {
      throw new Error('Unavailable character')
    }
    return 'first-character'
  })
  const hook = renderHook(() =>
    usePuppet({assetId, canvas: () => document.createElement('canvas'), load, onError: error}),
  )
  await waitFor(() => expect(hook.result.ready()).toBe(true))
  setAssetId('broken')
  await waitFor(() => expect(error).toHaveBeenCalledOnce())
  expect(hook.result.ready()).toBe(false)
  expect(player.destroy).not.toHaveBeenCalled()
  hook.cleanup()
})
