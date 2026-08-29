/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {createSignal, on, onCleanup, onMount} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {reportClientError} from '../../../features/client-error-reporter'
import {getPSceneLayer} from '../../../features/focus-room-animation/scene-layer-catalog'
import {PSceneRenderer} from '../../../features/focus-room-animation/scene-renderer'
import {applyWeatherSceneLayer} from '../../../features/weather'
import PSceneCanvas, {type PSceneCanvasProps} from '../SceneCanvas'

vi.mock('../../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))
vi.mock('../../../features/focus-room-animation/scene-layer-catalog', () => ({
  getPSceneLayer: vi.fn(),
}))
vi.mock('../../../features/focus-room-animation/scene-renderer', () => ({
  PSceneRenderer: vi.fn(),
}))
vi.mock('../../../features/weather', () => ({applyWeatherSceneLayer: vi.fn()}))
vi.mock('solid-js', async () => {
  const actual: typeof import('solid-js') = await vi.importActual('solid-js')

  return {
    ...actual,
    createSignal: vi.fn(actual.createSignal),
    on: vi.fn(actual.on),
    onCleanup: vi.fn(actual.onCleanup),
    onMount: vi.fn(actual.onMount),
  }
})

interface MockRenderer {
  readonly destroy: ReturnType<typeof vi.fn>
  readonly initialize: ReturnType<typeof vi.fn>
  readonly update: ReturnType<typeof vi.fn>
}

const renderers: MockRenderer[] = []

const initialProps: PSceneCanvasProps = {
  activity: 'reading',
  depthSource: '/day-depth.webp',
  gaze: 'user',
  motionInput: 'drag',
  motionMode: 'depth',
  sceneId: 'day-reading-user',
  sceneStyle: 'original',
  source: '/day.webp',
  time: 'day',
  viseme: 'rest',
  weatherCondition: 'clear',
}

const createRenderer = (): MockRenderer => {
  const renderer: MockRenderer = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
  }
  renderers.push(renderer)
  return renderer
}

beforeEach(() => {
  vi.clearAllMocks()
  renderers.length = 0
  vi.mocked(getPSceneLayer).mockImplementation((sceneId, sceneStyle) => ({
    background: '#000',
    height: 100,
    id: `${sceneId}-${sceneStyle ?? 'original'}`,
    layers: [],
    width: 100,
  }))
  vi.mocked(applyWeatherSceneLayer).mockImplementation(
    (scene, _sceneId, _sceneStyle, condition) => ({
      ...scene,
      id: `${scene.id}-${condition}`,
    }),
  )
  vi.mocked(PSceneRenderer).mockImplementation(function MockSceneRenderer() {
    return createRenderer() as never
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PSceneCanvas', () => {
  it('should initialize, reactively update, and destroy the scene renderer', async () => {
    const onLoadingChange = vi.fn()
    const onMotionInputChange = vi.fn()
    const [props, setProps] = createSignal<PSceneCanvasProps>({
      ...initialProps,
      onLoadingChange,
      onMotionInputChange,
    })
    const view = render(() => <PSceneCanvas {...props()} />)

    expect(PSceneRenderer).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      onLoadingChange,
      onMotionInputChange,
    })
    expect(renderers[0].initialize).toHaveBeenCalledWith({
      activity: 'reading',
      depthSource: '/day-depth.webp',
      gaze: 'user',
      layerScene: expect.objectContaining({id: 'day-reading-user-original-clear'}),
      motionInput: 'drag',
      motionMode: 'depth',
      sceneStyle: 'original',
      source: '/day.webp',
      time: 'day',
      viseme: 'rest',
    })
    expect(view.container.firstElementChild).toHaveClass('cursor-grab')

    setProps({
      activity: 'writing',
      depthSource: '/night-depth.webp',
      gaze: 'focused',
      motionInput: 'gyroscope',
      motionMode: 'pan',
      onLoadingChange,
      onMotionInputChange,
      sceneId: 'night-writing-focused',
      sceneStyle: 'scribble',
      source: '/night.webp',
      time: 'night',
      viseme: 'open',
      weatherCondition: 'rain',
    })

    await waitFor(() => {
      expect(renderers[0].update).toHaveBeenCalledWith({
        activity: 'writing',
        depthSource: '/night-depth.webp',
        gaze: 'focused',
        layerScene: expect.objectContaining({id: 'night-writing-focused-scribble-rain'}),
        motionInput: 'gyroscope',
        motionMode: 'pan',
        sceneStyle: 'scribble',
        source: '/night.webp',
        time: 'night',
        viseme: 'open',
      })
    })

    view.unmount()
    expect(renderers[0].destroy).toHaveBeenCalledOnce()

    const deferredUpdate = vi.mocked(on).mock.calls.find((call) => call[2]?.defer === true)?.[1] as
      | (() => void)
      | undefined
    deferredUpdate?.()
    const rendererCleanup = vi.mocked(onCleanup).mock.calls.at(-1)?.[0]
    rendererCleanup?.()
    expect(renderers[0].destroy).toHaveBeenCalledOnce()
  })

  it('should default the scene style and weather condition', () => {
    const defaultedProps: PSceneCanvasProps = {
      activity: 'reading',
      depthSource: '/day-depth.webp',
      gaze: 'user',
      motionInput: 'drag',
      motionMode: 'depth',
      sceneId: 'day-reading-user',
      source: '/day.webp',
      time: 'day',
      viseme: 'rest',
    }
    render(() => <PSceneCanvas {...defaultedProps} />)

    expect(applyWeatherSceneLayer).toHaveBeenCalledWith(
      expect.anything(),
      'day-reading-user',
      'original',
      'clear',
    )
  })

  it('should report initialization failures and settle loading when a callback exists', async () => {
    const error = new Error('initialize failed')
    const onLoadingChange = vi.fn()
    vi.mocked(PSceneRenderer).mockImplementationOnce(function MockFailingRenderer() {
      const renderer = createRenderer()
      renderer.initialize.mockRejectedValue(error)
      return renderer as never
    })

    render(() => <PSceneCanvas {...initialProps} onLoadingChange={onLoadingChange} />)
    await waitFor(() => expect(reportClientError).toHaveBeenCalledOnce())

    expect(onLoadingChange).toHaveBeenCalledWith(false)
    expect(reportClientError).toHaveBeenCalledWith(error, {
      feature: 'focus-room-scene',
      source: 'direct',
    })
  })

  it('should report initialization failures without a loading callback', async () => {
    vi.mocked(PSceneRenderer).mockImplementationOnce(function MockFailingRenderer() {
      const renderer = createRenderer()
      renderer.initialize.mockRejectedValue(new Error('initialize failed'))
      return renderer as never
    })

    render(() => <PSceneCanvas {...initialProps} />)

    await waitFor(() => expect(reportClientError).toHaveBeenCalledOnce())
  })

  it('should return from mount when its host ref is unavailable', () => {
    render(() => <PSceneCanvas {...initialProps} />)
    const hostSignal = vi
      .mocked(createSignal)
      .mock.results.map((result) => result.value as ReturnType<typeof createSignal>)
      .find(([value]) => value() instanceof HTMLDivElement)
    const mountCallback = vi.mocked(onMount).mock.calls.at(-1)?.[0]
    hostSignal?.[1](undefined)
    vi.clearAllMocks()

    mountCallback?.()

    expect(PSceneRenderer).not.toHaveBeenCalled()
  })
})
