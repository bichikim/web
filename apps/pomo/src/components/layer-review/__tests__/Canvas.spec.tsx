/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {getPSceneReviewLayer} from '../../../features/focus-room-animation/scene-layer-catalog'
import {PLayerReviewRenderer} from '../../../features/focus-room-layer-review/scene-renderer'
import PLayerReviewCanvas, {type PLayerReviewCanvasProps} from '../Canvas'

vi.mock('../../../features/focus-room-animation/scene-layer-catalog', () => ({
  getPSceneReviewLayer: vi.fn(),
}))
vi.mock('../../../features/focus-room-layer-review/scene-renderer', () => ({
  PLayerReviewRenderer: vi.fn(),
}))

const initialProps: PLayerReviewCanvasProps = {
  activity: 'reading',
  animationEnabled: true,
  eyeMode: 'auto',
  eyesVisible: true,
  gaze: 'focused',
  handsVisible: true,
  headVisible: true,
  mouthFrame: null,
  mouthPositionComparison: false,
  mouthVisible: true,
  referenceOpacity: 0,
  sceneId: 'day-reading-focused',
  sceneStyle: 'original',
  time: 'day',
  viseme: 'rest',
}

const renderer = {
  destroy: vi.fn(),
  initialize: vi.fn(() => Promise.resolve()),
  replaceDefinition: vi.fn(() => Promise.resolve()),
  update: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPSceneReviewLayer).mockImplementation((sceneId, sceneStyle) => ({
    background: '#000',
    height: 100,
    id: `${sceneId}-${sceneStyle}`,
    layers: [],
    width: 100,
  }))
  vi.mocked(PLayerReviewRenderer).mockImplementation(function MockRenderer() {
    return renderer as never
  })
  renderer.initialize.mockResolvedValue(undefined)
  renderer.replaceDefinition.mockResolvedValue(undefined)
})

describe('PLayerReviewCanvas', () => {
  it('should initialize, update, replace, and destroy the renderer', async () => {
    const [props, setProps] = createSignal(initialProps)
    const Harness = () => <PLayerReviewCanvas {...props()} />
    const view = render(() => <Harness />)

    expect(PLayerReviewRenderer).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      definition: expect.objectContaining({id: 'day-reading-focused-original'}),
    })
    expect(renderer.initialize).toHaveBeenCalledWith(
      expect.objectContaining({activity: 'reading', sceneStyle: 'original', viseme: 'rest'}),
    )

    setProps({
      ...initialProps,
      activity: 'writing',
      animationEnabled: false,
      eyeMode: 'closed',
      eyesVisible: false,
      gaze: 'user',
      handsVisible: false,
      headVisible: false,
      mouthFrame: 'open',
      mouthPositionComparison: true,
      mouthVisible: false,
      referenceOpacity: 0.5,
      sceneId: 'night-reading-focused',
      sceneStyle: 'scribble',
      time: 'night',
      viseme: 'open',
    })

    await waitFor(() => {
      expect(renderer.replaceDefinition).toHaveBeenCalledWith(
        expect.objectContaining({id: 'night-reading-focused-scribble'}),
      )
      expect(renderer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'writing',
          animationEnabled: false,
          eyeMode: 'closed',
          sceneStyle: 'scribble',
          time: 'night',
          viseme: 'open',
        }),
      )
    })

    view.unmount()
    expect(renderer.destroy).toHaveBeenCalledOnce()
  })

  it('should report initialization and replacement failures', async () => {
    const initializeError = new Error('initialize failed')
    const replacementError = new Error('replace failed')
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    renderer.initialize.mockRejectedValueOnce(initializeError)
    renderer.replaceDefinition.mockRejectedValueOnce(replacementError)
    const [props, setProps] = createSignal(initialProps)

    render(() => <PLayerReviewCanvas {...props()} />)
    await waitFor(() => expect(reportError).toHaveBeenCalledWith(initializeError))

    setProps({...initialProps, sceneId: 'night-reading-focused'})
    await waitFor(() => expect(reportError).toHaveBeenCalledWith(replacementError))
  })

  it('should skip initialization when the host signal is unavailable', async () => {
    vi.resetModules()
    vi.doMock('solid-js', async () => {
      const actual: typeof import('solid-js') = await vi.importActual('solid-js')

      return {...actual, createSignal: vi.fn(actual.createSignal), onMount: vi.fn()}
    })

    const isolatedSolid = await import('solid-js')
    vi.mocked(isolatedSolid.createSignal).mockImplementationOnce(
      () => [() => undefined, () => undefined] as never,
    )
    vi.mocked(isolatedSolid.onMount).mockImplementation((callback) => callback())

    const {default: IsolatedCanvas} = await import('../Canvas')
    const {PLayerReviewRenderer: IsolatedRenderer} =
      await import('../../../features/focus-room-layer-review/scene-renderer')

    render(() => <IsolatedCanvas {...initialProps} />)

    expect(IsolatedRenderer).not.toHaveBeenCalled()
    vi.doUnmock('solid-js')
  })
})
