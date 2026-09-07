/** @vitest-environment jsdom */

import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Engine} from '@babylonjs/core/Engines/engine'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import {render, waitFor} from '@solidjs/testing-library'
import {createSignal, onCleanup, onMount} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {reportClientError} from '../../../features/client-error-reporter'
import CharacterCanvas from '../Canvas'
import type {CameraCommand} from '../camera-control'

vi.mock('@babylonjs/core/Cameras/arcRotateCamera', () => ({ArcRotateCamera: vi.fn()}))
vi.mock('@babylonjs/core/Engines/engine', () => ({Engine: vi.fn()}))
vi.mock('@babylonjs/core/Lights/directionalLight', () => ({DirectionalLight: vi.fn()}))
vi.mock('@babylonjs/core/Lights/hemisphericLight', () => ({HemisphericLight: vi.fn()}))
vi.mock('@babylonjs/core/Loading/sceneLoader', () => ({LoadAssetContainerAsync: vi.fn()}))
vi.mock('@babylonjs/core/scene', () => ({Scene: vi.fn()}))
vi.mock('@babylonjs/loaders/glTF', () => ({}))
vi.mock('../../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))
vi.mock('solid-js', async () => {
  const actual: typeof import('solid-js') = await vi.importActual('solid-js')

  return {
    ...actual,
    createSignal: vi.fn(actual.createSignal),
    onCleanup: vi.fn(actual.onCleanup),
    onMount: vi.fn(actual.onMount),
  }
})

interface MockEngine {
  getDeltaTime: ReturnType<typeof vi.fn>
  getAspectRatio: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  renderLoop: (() => void) | null
  resize: ReturnType<typeof vi.fn>
  runRenderLoop: ReturnType<typeof vi.fn>
  stopRenderLoop: ReturnType<typeof vi.fn>
}

interface MockScene {
  clearColor: unknown
  dispose: ReturnType<typeof vi.fn>
  getWorldExtends: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
}

interface MockCamera {
  attachControl: ReturnType<typeof vi.fn>
  autoRotationBehavior: {idleRotationSpeed: number; idleRotationWaitTime: number} | null
  inertia: number
  lowerRadiusLimit: number
  maxZ: number
  minZ: number
  panningSensibility: number
  radius: number
  storeState: ReturnType<typeof vi.fn>
  setTarget: ReturnType<typeof vi.fn>
  upperRadiusLimit: number
  useAutoRotationBehavior: boolean
  wheelDeltaPercentage: number
}

interface MockLight {
  diffuse: unknown
  groundColor?: unknown
  intensity: number
}

interface MockContainer {
  transformNodes: []
  addAllToScene: ReturnType<typeof vi.fn>
  animationGroups: Array<{start: ReturnType<typeof vi.fn>}>
  dispose: ReturnType<typeof vi.fn>
  meshes: Array<{getTotalVertices: ReturnType<typeof vi.fn>}>
  removeAllFromScene: ReturnType<typeof vi.fn>
}

interface LoadCallbacks {
  readonly onProgress: (event: {loaded: number; total: number}) => void
  readonly pluginExtension: string
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
  readonly #callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
    MockResizeObserver.instances.push(this)
  }

  trigger() {
    this.#callback([], this as unknown as ResizeObserver)
  }
}

const engines: MockEngine[] = []
const scenes: MockScene[] = []
const cameras: MockCamera[] = []
const ambientLights: MockLight[] = []
const keyLights: MockLight[] = []
let nextAutoRotationBehavior: MockCamera['autoRotationBehavior'] = {
  idleRotationSpeed: 0,
  idleRotationWaitTime: 0,
}

const createEngine = (): MockEngine => {
  const engine: MockEngine = {
    dispose: vi.fn(),
    getAspectRatio: vi.fn(() => 2),
    getDeltaTime: vi.fn(() => 16),
    renderLoop: null,
    resize: vi.fn(),
    runRenderLoop: vi.fn((callback: () => void) => {
      engine.renderLoop = callback
    }),
    stopRenderLoop: vi.fn(),
  }
  engines.push(engine)
  return engine
}

const createScene = (): MockScene => {
  const scene: MockScene = {
    clearColor: null,
    dispose: vi.fn(),
    getWorldExtends: vi.fn((predicate: (mesh: object) => boolean) => {
      predicate({})
      return {
        max: new Vector3(1, 1, 1),
        min: new Vector3(-1, -1, -1),
      }
    }),
    render: vi.fn(),
  }
  scenes.push(scene)
  return scene
}

const createCamera = (): MockCamera => {
  const camera: MockCamera = {
    attachControl: vi.fn(),
    autoRotationBehavior: nextAutoRotationBehavior,
    inertia: 0,
    lowerRadiusLimit: 0,
    maxZ: 0,
    minZ: 0,
    panningSensibility: 1,
    radius: 0,
    setTarget: vi.fn(),
    storeState: vi.fn(),
    upperRadiusLimit: 0,
    useAutoRotationBehavior: false,
    wheelDeltaPercentage: 0,
  }
  cameras.push(camera)
  return camera
}

const createContainer = ({
  animationCount = 1,
  vertexCounts = [10],
}: {
  readonly animationCount?: number
  readonly vertexCounts?: readonly number[]
} = {}): MockContainer => ({
  addAllToScene: vi.fn(),
  animationGroups: Array.from({length: animationCount}, () => ({start: vi.fn()})),
  dispose: vi.fn(),
  meshes: vertexCounts.map((count) => ({getTotalVertices: vi.fn().mockReturnValue(count)})),
  removeAllFromScene: vi.fn(),
  transformNodes: [],
})

const createCallbacks = () => ({
  onLoadError: vi.fn(),
  onLoadProgress: vi.fn(),
  onLoadStart: vi.fn(),
  onLoadSuccess: vi.fn(),
})

const getLoadCallbacks = (callIndex = 0) =>
  vi.mocked(LoadAssetContainerAsync).mock.calls[callIndex]?.[2] as LoadCallbacks

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.clearAllMocks()
  engines.length = 0
  scenes.length = 0
  cameras.length = 0
  ambientLights.length = 0
  keyLights.length = 0
  MockResizeObserver.instances.length = 0
  nextAutoRotationBehavior = {idleRotationSpeed: 0, idleRotationWaitTime: 0}

  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.mocked(Engine).mockImplementation(function MockEngineConstructor() {
    return createEngine() as never
  })
  vi.mocked(Scene).mockImplementation(function MockSceneConstructor() {
    return createScene() as never
  })
  vi.mocked(ArcRotateCamera).mockImplementation(function MockCameraConstructor() {
    return createCamera() as never
  })
  vi.mocked(HemisphericLight).mockImplementation(function MockAmbientLightConstructor() {
    const light: MockLight = {diffuse: null, groundColor: null, intensity: 0}
    ambientLights.push(light)
    return light as never
  })
  vi.mocked(DirectionalLight).mockImplementation(function MockKeyLightConstructor() {
    const light: MockLight = {diffuse: null, intensity: 0}
    keyLights.push(light)
    return light as never
  })
  vi.mocked(LoadAssetContainerAsync).mockResolvedValue(createContainer() as never)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CharacterCanvas setup', () => {
  it('should use a narrow perspective lens without orthographic bounds', async () => {
    const callbacks = createCallbacks()
    render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())
    engines[0].renderLoop?.()
    expect(cameras[0]).toMatchObject({alpha: Math.PI / 2, beta: Math.PI / 2, fov: 0.25, mode: 0})
    expect(cameras[0]).not.toHaveProperty('orthoTop')
    expect(cameras[0]).not.toHaveProperty('orthoRight')
  })
  it('should apply repeated camera commands without reloading the model', async () => {
    const callbacks = createCallbacks()
    const [command, setCommand] = createSignal<CameraCommand | null>(null)
    render(() => (
      <CharacterCanvas modelUrl="/character.glb" cameraCommand={command()} {...callbacks} />
    ))
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())
    const initialRadius = cameras[0].radius
    setCommand({action: 'zoom-in'})
    const firstRadius = cameras[0].radius
    expect(firstRadius).toBeLessThan(initialRadius)
    setCommand({action: 'zoom-in'})
    expect(cameras[0].radius).toBeLessThan(firstRadius)
    expect(cameras[0].useAutoRotationBehavior).toBe(false)
    expect(LoadAssetContainerAsync).toHaveBeenCalledOnce()
  })

  it('should initialize and update expressions without reloading the model', async () => {
    const target = {influence: 0, name: 'Fcl_MTH_A'}
    const container = createContainer()
    Object.assign(container.meshes[0], {
      morphTargetManager: {getTarget: () => target, numTargets: 1},
    })
    vi.mocked(LoadAssetContainerAsync).mockResolvedValueOnce(container as never)
    const [expressions, setExpressions] = createSignal({
      blink: 0,
      emotion: '',
      emotionWeight: 1,
      mouth: 'A',
      mouthWeight: 0.5,
    })
    render(() => (
      <CharacterCanvas
        modelUrl="/character.glb"
        expressions={expressions()}
        {...createCallbacks()}
      />
    ))
    await waitFor(() => expect(target.influence).toBe(0.5))
    setExpressions((value) => ({...value, mouth: 'O'}))
    expect(target.influence).toBe(0)
    expect(LoadAssetContainerAsync).toHaveBeenCalledOnce()
  })

  it('should apply face settings on load and reset without reloading', async () => {
    const target = {influence: 0, name: 'PomoFace:ear-size:plus'}
    const container = createContainer()
    Object.assign(container.meshes[0], {
      morphTargetManager: {getTarget: () => target, numTargets: 1},
    })
    vi.mocked(LoadAssetContainerAsync).mockResolvedValueOnce(container as never)
    const [size, setSize] = createSignal(0.5)
    render(() => (
      <CharacterCanvas
        modelUrl="/character.glb"
        faceSettings={{'ear-size': size()}}
        {...createCallbacks()}
      />
    ))
    await waitFor(() => expect(target.influence).toBe(0.5))
    setSize(0)
    expect(target.influence).toBe(0)
    expect(LoadAssetContainerAsync).toHaveBeenCalledOnce()
  })

  it('should update eye narrowing without reloading the model', async () => {
    const target = {influence: 0, name: 'PomoEyeNarrowing'}
    const container = createContainer()
    Object.assign(container.meshes[0], {
      morphTargetManager: {getTarget: () => target, numTargets: 1},
    })
    vi.mocked(LoadAssetContainerAsync).mockResolvedValueOnce(container as never)
    const [narrowing, setNarrowing] = createSignal(0.25)
    render(() => (
      <CharacterCanvas
        modelUrl="/character.glb"
        eyeNarrowing={narrowing()}
        {...createCallbacks()}
      />
    ))
    await waitFor(() => expect(target.influence).toBe(0.25))
    setNarrowing(1)
    expect(target.influence).toBe(1)
    expect(LoadAssetContainerAsync).toHaveBeenCalledOnce()
  })

  it('should initialize Babylon, render, resize, configure lights, and clean up', async () => {
    const callbacks = createCallbacks()
    const container = createContainer({animationCount: 2})
    vi.mocked(LoadAssetContainerAsync).mockResolvedValueOnce(container as never)

    const view = render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())

    const canvas = view.container.querySelector('canvas')
    expect(canvas).toHaveClass('touch-none')
    expect(Engine).toHaveBeenCalledWith(
      canvas,
      true,
      {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
      true,
    )
    expect(Scene).toHaveBeenCalledWith(engines[0])
    expect(ArcRotateCamera).toHaveBeenCalledWith(
      'character-camera',
      Math.PI / 2,
      Math.PI / 2,
      5,
      Vector3.Zero(),
      scenes[0],
    )
    expect(cameras[0].attachControl).toHaveBeenCalledWith(canvas, true)
    expect(cameras[0]).toMatchObject({
      alpha: Math.PI / 2,
      beta: Math.PI / 2,
      fov: 0.25,
      inertia: 0.8,
      panningSensibility: 0,
      useAutoRotationBehavior: false,
      wheelDeltaPercentage: 0.01,
    })
    expect(cameras[0].autoRotationBehavior).toEqual({
      idleRotationSpeed: 0,
      idleRotationWaitTime: 0,
    })
    expect(ambientLights[0]).toMatchObject({intensity: 0.85})
    expect(keyLights[0]).toMatchObject({intensity: 2.4})
    expect(keyLights[1]).toMatchObject({intensity: 1.2})
    expect(LoadAssetContainerAsync).toHaveBeenCalledWith('/character.glb', scenes[0], {
      onProgress: expect.any(Function),
      pluginExtension: '.glb',
    })
    expect(container.addAllToScene).toHaveBeenCalledOnce()
    expect(container.animationGroups[0]?.start).toHaveBeenCalledWith(true)
    expect(container.animationGroups[1]?.start).toHaveBeenCalledWith(true)

    engines[0].renderLoop?.()
    MockResizeObserver.instances[0]?.trigger()
    expect(scenes[0].render).toHaveBeenCalledOnce()
    expect(engines[0].resize).toHaveBeenCalledOnce()

    view.unmount()
    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce()
    expect(engines[0].stopRenderLoop).toHaveBeenCalledOnce()
    expect(container.removeAllFromScene).toHaveBeenCalledOnce()
    expect(container.dispose).toHaveBeenCalledOnce()
    expect(scenes[0].dispose).toHaveBeenCalledOnce()
    expect(engines[0].dispose).toHaveBeenCalledOnce()
  })

  it('should report an engine construction error and skip scene setup', () => {
    const error = new Error('WebGL unavailable')
    vi.mocked(Engine).mockImplementationOnce(function MockFailingEngine() {
      throw error
    })
    const callbacks = createCallbacks()

    render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)

    expect(reportClientError).toHaveBeenCalledWith(error, {
      feature: 'character-renderer',
      source: 'direct',
    })
    expect(callbacks.onLoadError).toHaveBeenCalledOnce()
    expect(Scene).not.toHaveBeenCalled()
  })

  it('should skip auto-rotation tuning when Babylon does not expose the behavior', async () => {
    nextAutoRotationBehavior = null
    const callbacks = createCallbacks()

    render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())

    expect(cameras[0].autoRotationBehavior).toBeNull()
  })

  it('should return from mount when no canvas ref is available', () => {
    const callbacks = createCallbacks()
    render(() => <CharacterCanvas modelUrl="/unused.glb" {...callbacks} />)
    const signalIndex = vi.mocked(createSignal).mock.calls.findIndex(([value]) => value === null)
    const canvasSignal = vi.mocked(createSignal).mock.results[signalIndex]?.value as ReturnType<
      typeof createSignal<HTMLCanvasElement | null>
    >
    const mountCallback = vi.mocked(onMount).mock.calls.at(-1)?.[0]
    canvasSignal[1](null)
    vi.clearAllMocks()

    mountCallback?.()

    expect(Engine).not.toHaveBeenCalled()
  })

  it('should tolerate effect cleanup after outer cleanup invalidates the load revision', async () => {
    const callbacks = createCallbacks()
    render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())
    const cleanupCallbacks = vi.mocked(onCleanup).mock.calls.map(([callback]) => callback)
    const effectCleanup = cleanupCallbacks.at(-2)
    const outerCleanup = cleanupCallbacks.at(-1)

    outerCleanup?.()
    effectCleanup?.()

    expect(engines[0].dispose).toHaveBeenCalledOnce()
  })
})

describe('CharacterCanvas loading', () => {
  it('should emit current progress and ignore empty totals', async () => {
    const callbacks = createCallbacks()
    render(() => <CharacterCanvas modelUrl="/character.glb" {...callbacks} />)

    getLoadCallbacks().onProgress({loaded: 3, total: 4})
    getLoadCallbacks().onProgress({loaded: 3, total: 0})

    expect(callbacks.onLoadProgress).toHaveBeenCalledOnce()
    expect(callbacks.onLoadProgress).toHaveBeenCalledWith(75)
  })

  it('should dispose a stale success and ignore its progress', async () => {
    let resolveFirst: ((container: never) => void) | undefined
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const currentContainer = createContainer()
    vi.mocked(LoadAssetContainerAsync)
      .mockReturnValueOnce(firstPromise as never)
      .mockResolvedValueOnce(currentContainer as never)
    const callbacks = createCallbacks()
    const [modelUrl, setModelUrl] = createSignal('/first.glb')
    render(() => <CharacterCanvas modelUrl={modelUrl()} {...callbacks} />)
    const firstProgress = getLoadCallbacks().onProgress

    setModelUrl('/second.glb')
    await waitFor(() => expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2))
    firstProgress({loaded: 1, total: 2})
    const staleContainer = createContainer()
    resolveFirst?.(staleContainer as never)
    await flushPromises()

    expect(callbacks.onLoadProgress).not.toHaveBeenCalled()
    expect(staleContainer.dispose).toHaveBeenCalledOnce()
    expect(staleContainer.addAllToScene).not.toHaveBeenCalled()
    expect(currentContainer.addAllToScene).toHaveBeenCalledOnce()
    expect(callbacks.onLoadStart).toHaveBeenCalledTimes(2)
  })

  it('should ignore a stale rejection', async () => {
    let rejectFirst: ((error: Error) => void) | undefined
    vi.mocked(LoadAssetContainerAsync)
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        }) as never,
      )
      .mockResolvedValueOnce(createContainer() as never)
    const callbacks = createCallbacks()
    const [modelUrl, setModelUrl] = createSignal('/first.glb')
    render(() => <CharacterCanvas modelUrl={modelUrl()} {...callbacks} />)
    setModelUrl('/second.glb')
    await waitFor(() => expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2))

    rejectFirst?.(new Error('stale failure'))
    await flushPromises()

    expect(reportClientError).not.toHaveBeenCalled()
    expect(callbacks.onLoadError).not.toHaveBeenCalled()
  })

  it('should report a current load failure and unload the active model', async () => {
    const firstContainer = createContainer()
    const error = new Error('model failed')
    vi.mocked(LoadAssetContainerAsync)
      .mockResolvedValueOnce(firstContainer as never)
      .mockRejectedValueOnce(error)
    const callbacks = createCallbacks()
    const [modelUrl, setModelUrl] = createSignal('/first.glb')
    render(() => <CharacterCanvas modelUrl={modelUrl()} {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())

    setModelUrl('/second.glb')
    await waitFor(() => expect(callbacks.onLoadError).toHaveBeenCalledOnce())

    expect(firstContainer.removeAllFromScene).toHaveBeenCalledOnce()
    expect(firstContainer.dispose).toHaveBeenCalledOnce()
    expect(reportClientError).toHaveBeenCalledWith(error, {
      feature: 'character-model',
      source: 'direct',
    })
  })
})

describe('CharacterCanvas camera fitting', () => {
  it('should skip fitting empty and degenerate mesh bounds', async () => {
    const emptyContainer = createContainer({animationCount: 0, vertexCounts: [0, 0]})
    const degenerateContainer = createContainer({animationCount: 0})
    vi.mocked(LoadAssetContainerAsync)
      .mockResolvedValueOnce(emptyContainer as never)
      .mockResolvedValueOnce(degenerateContainer as never)
    const callbacks = createCallbacks()
    const [modelUrl, setModelUrl] = createSignal('/empty.glb')
    render(() => <CharacterCanvas modelUrl={modelUrl()} {...callbacks} />)
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())
    expect(scenes[0].getWorldExtends).not.toHaveBeenCalled()

    scenes[0].getWorldExtends.mockReturnValueOnce({
      max: new Vector3(1, 1, 1),
      min: new Vector3(1, 1, 1),
    })
    setModelUrl('/degenerate.glb')
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledTimes(2))

    expect(cameras[0].setTarget).not.toHaveBeenCalled()
  })

  it('should skip fitting non-finite bounds', async () => {
    const callbacks = createCallbacks()
    render(() => <CharacterCanvas modelUrl="/invalid.glb" {...callbacks} />)
    scenes[0].getWorldExtends.mockReturnValue({
      max: new Vector3(Number.POSITIVE_INFINITY, 0, 0),
      min: Vector3.Zero(),
    })

    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())
    expect(cameras[0].setTarget).not.toHaveBeenCalled()
  })

  it('should allow close inspection while fitting small and large model bounds', async () => {
    const firstContainer = createContainer()
    const secondContainer = createContainer()
    vi.mocked(LoadAssetContainerAsync)
      .mockResolvedValueOnce(firstContainer as never)
      .mockResolvedValueOnce(secondContainer as never)
    const callbacks = createCallbacks()
    const [modelUrl, setModelUrl] = createSignal('/small.glb')
    render(() => <CharacterCanvas modelUrl={modelUrl()} {...callbacks} />)
    scenes[0].getWorldExtends.mockReturnValueOnce({
      max: new Vector3(0.01, 0, 0),
      min: Vector3.Zero(),
    })
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce())

    expect(cameras[0]).toMatchObject({
      lowerRadiusLimit: 0.1,
      maxZ: 100,
      minZ: 0.001,
      upperRadiusLimit: expect.any(Number),
    })

    expect(cameras[0].upperRadiusLimit).toBeGreaterThanOrEqual(cameras[0].lowerRadiusLimit)
    scenes[0].getWorldExtends.mockReturnValueOnce({
      max: new Vector3(200, 0, 0),
      min: Vector3.Zero(),
    })
    setModelUrl('/large.glb')
    await waitFor(() => expect(callbacks.onLoadSuccess).toHaveBeenCalledTimes(2))

    expect(cameras[0].setTarget).toHaveBeenLastCalledWith(new Vector3(100, 0, 0))
    expect(cameras[0].radius).toBeGreaterThan(600)
    expect(cameras[0].radius * Math.tan(0.25 / 2)).toBeCloseTo(270 * Math.tan(0.8 / 2))
    expect(cameras[0].lowerRadiusLimit / cameras[0].radius).toBeCloseTo(8 / 270)
    expect(cameras[0].upperRadiusLimit / cameras[0].radius).toBeCloseTo(600 / 270)
    expect(cameras[0]).toMatchObject({
      lowerRadiusLimit: expect.any(Number),
      maxZ: 20_000,
      minZ: 0.2,
      radius: expect.any(Number),
      upperRadiusLimit: expect.any(Number),
    })
  })
})
