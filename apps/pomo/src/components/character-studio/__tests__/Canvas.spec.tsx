/** @vitest-environment jsdom */
import {Engine} from '@babylonjs/core/Engines/engine'
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createCharacterRenderer} from '../renderer'
import {applyCameraCommand, type CameraCommand} from '../camera-control'
import {reportClientError} from '../../../features/client-error-reporter'
import CharacterCanvas from '../Canvas'

vi.mock('@babylonjs/core/Engines/engine', () => ({Engine: vi.fn()}))
vi.mock('../camera-control', () => ({applyCameraCommand: vi.fn()}))
vi.mock('../renderer', () => ({createCharacterRenderer: vi.fn()}))
vi.mock('../../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))

const engine = {
  dispose: vi.fn(),
  getDeltaTime: () => 16,
  resize: vi.fn(),
  runRenderLoop: vi.fn<(callback: () => void) => void>(),
  stopRenderLoop: vi.fn(),
}
const renderer = {
  appearance: vi.fn(),
  camera: {attachControl: vi.fn()},
  dispose: vi.fn(),
  load: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
}
const observer = {disconnect: vi.fn(), observe: vi.fn()}
const callbacks = () => ({
  onLoadError: vi.fn(),
  onLoadProgress: vi.fn(),
  onLoadStart: vi.fn(),
  onLoadSuccess: vi.fn(),
})
const events = () => vi.mocked(createCharacterRenderer).mock.calls[0][1]
let resize: ResizeObserverCallback
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Engine).mockImplementation(function MockEngine() {
    return engine as never
  })
  vi.mocked(createCharacterRenderer).mockReturnValue(renderer as never)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe = observer.observe
      disconnect = observer.disconnect
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('CharacterCanvas', () => {
  it('should attach the canvas, forward model changes and clean up browser resources', () => {
    const [url, setUrl] = createSignal('/first.glb')
    const view = render(() => <CharacterCanvas modelUrl={url()} {...callbacks()} />)
    const canvas = view.container.querySelector('canvas')
    expect(canvas).toHaveClass('touch-none')
    expect(renderer.camera.attachControl).toHaveBeenCalledWith(canvas, true)
    expect(renderer.load).toHaveBeenCalledWith('/first.glb')
    setUrl('/second.glb')
    expect(renderer.load).toHaveBeenLastCalledWith('/second.glb')
    resize([], observer as unknown as ResizeObserver)
    expect(engine.resize).toHaveBeenCalledOnce()
    view.unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(engine.stopRenderLoop).toHaveBeenCalledOnce()
    expect(renderer.dispose).toHaveBeenCalledOnce()
    expect(engine.dispose).toHaveBeenCalledOnce()
  })

  it('should forward repeated camera commands without loading again', () => {
    const [command, setCommand] = createSignal<CameraCommand | null>(null)
    render(() => (
      <CharacterCanvas modelUrl="/model.glb" cameraCommand={command()} {...callbacks()} />
    ))
    setCommand({action: 'zoom-in'})
    setCommand({action: 'zoom-in'})
    expect(applyCameraCommand).toHaveBeenCalledTimes(2)
    expect(applyCameraCommand).toHaveBeenLastCalledWith(renderer.camera, {action: 'zoom-in'})
    expect(renderer.load).toHaveBeenCalledOnce()
  })

  it('should update appearance independently of model loading', () => {
    const [value, setValue] = createSignal(0.3)
    render(() => <CharacterCanvas modelUrl="/model.glb" eyeNarrowing={value()} {...callbacks()} />)
    setValue(0.6)
    expect(renderer.appearance).toHaveBeenLastCalledWith(
      expect.objectContaining({eyeNarrowing: 0.6}),
    )
    expect(renderer.load).toHaveBeenCalledOnce()
  })

  it('should forward status and error events from the renderer', () => {
    const handlers = callbacks()
    render(() => <CharacterCanvas modelUrl="/model.glb" {...handlers} />)
    events().onStart()
    events().onProgress(75)
    events().onReady()
    const error = new Error('load failed')
    events().onError(error)
    expect(handlers.onLoadStart).toHaveBeenCalledOnce()
    expect(handlers.onLoadProgress).toHaveBeenCalledWith(75)
    expect(handlers.onLoadSuccess).toHaveBeenCalledOnce()
    expect(handlers.onLoadError).toHaveBeenCalledOnce()
    expect(reportClientError).toHaveBeenCalledWith(error, {
      feature: 'character-model',
      source: 'direct',
    })
  })

  it('should read current cloth controls in the render callback', () => {
    const view = render(() => <CharacterCanvas modelUrl="/model.glb" {...callbacks()} />)
    events().onCloth(true)
    const tick = engine.runRenderLoop.mock.calls[0][0]
    tick()
    expect(renderer.render).toHaveBeenLastCalledWith(0.016, true, 1)
    fireEvent.click(view.getByRole('button', {name: '바람 켜짐'}))
    tick()
    expect(renderer.render).toHaveBeenLastCalledWith(0.016, true, 0)
    fireEvent.click(view.getByRole('button', {name: '천 물리 켜짐'}))
    tick()
    expect(renderer.render).toHaveBeenLastCalledWith(0.016, false, 0)
    expect(view.getByRole('button', {name: '바람 꺼짐'})).toBeDisabled()
    events().onCloth(false)
    expect(view.queryByRole('button', {name: '천 물리 꺼짐'})).toBeNull()
  })

  it('should report WebGL initialization failures without constructing the renderer', () => {
    const error = new Error('WebGL unavailable')
    vi.mocked(Engine).mockImplementationOnce(function FailedEngine() {
      throw error
    })
    const handlers = callbacks()
    render(() => <CharacterCanvas modelUrl="/model.glb" {...handlers} />)
    expect(handlers.onLoadError).toHaveBeenCalledOnce()
    expect(createCharacterRenderer).not.toHaveBeenCalled()
    expect(reportClientError).toHaveBeenCalledWith(error, {
      feature: 'character-renderer',
      source: 'direct',
    })
  })
})
