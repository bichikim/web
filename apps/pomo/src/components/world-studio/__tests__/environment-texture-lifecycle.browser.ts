import {afterEach, expect, it, vi} from 'vitest'
import {Engine} from '@babylonjs/core/Engines/engine'
import {EngineStore} from '@babylonjs/core/Engines/engineStore'
import {RenderTargetWrapper} from '@babylonjs/core/Engines/renderTargetWrapper'
import {Scene} from '@babylonjs/core/scene'
import {EXRCubeTexture} from '@babylonjs/core/Materials/Textures/exrCubeTexture'
import {Effect} from '@babylonjs/core/Materials/effect'
import {EffectRenderer, EffectWrapper} from '@babylonjs/core/Materials/effectRenderer'
import {HDRIrradianceFiltering} from '@babylonjs/core/Materials/Textures/Filtering/hdrIrradianceFiltering'
import {HDRFiltering} from '@babylonjs/core/Materials/Textures/Filtering/hdrFiltering'
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial'
import {PostProcess} from '@babylonjs/core/PostProcesses/postProcess'
import type {CubeMapInfo} from '@babylonjs/core/Misc/HighDynamicRange/panoramaToCubemap'

const CUBE_SIZE = 4
const RGB_CHANNELS = 3
const RGB_FORMAT = 4
const FLOAT_TYPE = 1
const GRAY_VALUE = 0.5
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return {promise, resolve}
}
const resources: Array<() => void> = []
afterEach(() => {
  vi.restoreAllMocks()
  for (const dispose of resources.splice(0)) {
    dispose()
  }
})
const createScene = () => {
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  const engine = new Engine(canvas, false, {stencil: true})
  const scene = new Scene(engine)
  resources.push(() => {
    if (!scene.isDisposed) {
      scene.dispose()
    }
    if (!engine.isDisposed) {
      engine.dispose()
    }
    expect(EngineStore.Instances).not.toContain(engine)
    canvas.remove()
  })
  return {engine, scene}
}
const cubeFace = () => new Float32Array(CUBE_SIZE * CUBE_SIZE * RGB_CHANNELS).fill(GRAY_VALUE)
const cubeData = (): CubeMapInfo => ({
  back: cubeFace(),
  down: cubeFace(),
  format: RGB_FORMAT,
  front: cubeFace(),
  gammaSpace: false,
  left: cubeFace(),
  right: cubeFace(),
  size: CUBE_SIZE,
  type: FLOAT_TYPE,
  up: cubeFace(),
})
const createEnvironment = (scene: Scene, decode: Promise<CubeMapInfo>) => {
  const started = deferred<void>()
  const finished = deferred<{kind: 'loaded'} | {error: unknown; kind: 'error'}>()
  const loaded = vi.fn(() => finished.resolve({kind: 'loaded'}))
  const failed = vi.fn((_message?: string, error?: unknown) =>
    finished.resolve({error, kind: 'error'}),
  )
  class LocalEnvironment extends EXRCubeTexture {
    protected override async _getCubeMapTextureDataAsync() {
      started.resolve()
      return decode
    }
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array([1])]))
  resources.push(() => URL.revokeObjectURL(url))
  const texture = new LocalEnvironment(
    url,
    scene,
    CUBE_SIZE,
    true,
    false,
    false,
    true,
    loaded,
    failed,
    false,
    true,
  )
  return {failed, finished, loaded, started, texture}
}
const holdCompilation = (shader: string) => {
  const compiled = deferred<void>()
  const release = deferred<void>()
  const original = Effect.prototype.whenCompiledAsync
  vi.spyOn(Effect.prototype, 'whenCompiledAsync').mockImplementation(async function holdShader(
    this: Effect,
    ...args
  ) {
    const effect = await original.apply(this, args)
    if (JSON.stringify(this.name).includes(shader)) {
      compiled.resolve()
      await release.promise
    }
    return effect
  })
  return {compiled, release}
}
const holdBrdfCallback = () => {
  const compiled = deferred<() => void>()
  const original = Effect.prototype.executeWhenCompiled
  vi.spyOn(Effect.prototype, 'executeWhenCompiled').mockImplementation(
    function holdBrdf(this: Effect, callback) {
      return original.call(this, function onCompiled(effect) {
        if (JSON.stringify(effect.name).includes('rgbdDecode')) {
          compiled.resolve(callback.bind(undefined, effect))
          return
        }
        callback(effect)
      })
    },
  )
  return compiled
}

it('should retain native irradiance and radiance filtering for an active environment', async () => {
  const {scene} = createScene()
  const environment = createEnvironment(scene, Promise.resolve(cubeData()))
  expect(await environment.finished.promise).toEqual({kind: 'loaded'})
  expect(environment.texture.isReady()).toBe(true)
  expect(environment.texture.irradianceTexture).not.toBeNull()
  expect(scene.getWaitingItemsCount()).toBe(0)
})

it('should cancel native decoding before upload and release all environment pending tokens', async () => {
  const {engine, scene} = createScene()
  const decode = deferred<CubeMapInfo>()
  const upload = vi.spyOn(engine, 'updateRawCubeTexture')
  const environment = createEnvironment(scene, decode.promise)
  await environment.started.promise
  scene.dispose()
  engine.dispose()
  decode.resolve(cubeData())
  expect(await environment.finished.promise).toEqual({
    error: expect.objectContaining({name: 'AbortError'}),
    kind: 'error',
  })
  expect(environment.failed).toHaveBeenCalledTimes(1)
  expect(environment.loaded).not.toHaveBeenCalled()
  expect(upload).not.toHaveBeenCalled()
  expect(scene.getWaitingItemsCount()).toBe(0)
})

it('should cancel irradiance completion and release its effects', async () => {
  const {engine, scene} = createScene()
  const gate = holdCompilation('hdrIrradianceFiltering')
  const filtered = deferred<void>()
  const original = HDRIrradianceFiltering.prototype.prefilter
  vi.spyOn(HDRIrradianceFiltering.prototype, 'prefilter').mockImplementation(async function filter(
    this: HDRIrradianceFiltering,
    ...args
  ) {
    try {
      return await original.apply(this, args)
    } finally {
      filtered.resolve()
    }
  })
  const rendererDispose = vi.spyOn(EffectRenderer.prototype, 'dispose')
  const wrapperDispose = vi.spyOn(EffectWrapper.prototype, 'dispose')
  const bind = vi.spyOn(engine, 'bindBuffers')
  const environment = createEnvironment(scene, Promise.resolve(cubeData()))
  await gate.compiled.promise
  scene.dispose()
  engine.dispose()
  const before = bind.mock.calls.length
  gate.release.resolve()
  await filtered.promise
  await Promise.resolve()
  await Promise.resolve()
  expect(bind).toHaveBeenCalledTimes(before)
  expect(rendererDispose).toHaveBeenCalledTimes(1)
  expect(wrapperDispose).toHaveBeenCalledTimes(1)
  expect(environment.loaded).not.toHaveBeenCalled()
  expect(environment.failed).not.toHaveBeenCalled()
  expect(scene.getWaitingItemsCount()).toBe(0)
})

it('should cancel radiance completion and release its effects', async () => {
  const {engine, scene} = createScene()
  const gate = holdCompilation('hdrFiltering')
  const filtered = deferred<void>()
  const original = HDRFiltering.prototype.prefilter
  vi.spyOn(HDRFiltering.prototype, 'prefilter').mockImplementation(async function filter(
    this: HDRFiltering,
    ...args
  ) {
    try {
      return await original.apply(this, args)
    } finally {
      filtered.resolve()
    }
  })
  const rendererDispose = vi.spyOn(EffectRenderer.prototype, 'dispose')
  const wrapperDispose = vi.spyOn(EffectWrapper.prototype, 'dispose')
  const bind = vi.spyOn(engine, 'bindBuffers')
  const environment = createEnvironment(scene, Promise.resolve(cubeData()))
  await gate.compiled.promise
  scene.dispose()
  engine.dispose()
  const before = bind.mock.calls.length
  gate.release.resolve()
  await filtered.promise
  await Promise.resolve()
  await Promise.resolve()
  expect(bind).toHaveBeenCalledTimes(before)
  expect(rendererDispose).toHaveBeenCalledTimes(2)
  expect(wrapperDispose).toHaveBeenCalledTimes(2)
  expect(environment.loaded).not.toHaveBeenCalled()
  expect(environment.failed).not.toHaveBeenCalled()
  expect(scene.getWaitingItemsCount()).toBe(0)
})

it('should report an active filtering failure once and release pending data', async () => {
  const {scene} = createScene()
  const error = new Error('prefilter compilation failed')
  vi.spyOn(HDRIrradianceFiltering.prototype, 'prefilter').mockRejectedValue(error)
  const environment = createEnvironment(scene, Promise.resolve(cubeData()))
  expect(await environment.finished.promise).toEqual({error, kind: 'error'})
  expect(environment.failed).toHaveBeenCalledExactlyOnceWith(
    'Failed to prefilter environment texture',
    error,
  )
  expect(environment.loaded).not.toHaveBeenCalled()
  expect(scene.getWaitingItemsCount()).toBe(0)
})

it('should cancel BRDF completion and release its postprocess and target', async () => {
  const {engine, scene} = createScene()
  const compiled = holdBrdfCallback()
  const postprocessDispose = vi.spyOn(PostProcess.prototype, 'dispose')
  const targetDispose = vi.spyOn(RenderTargetWrapper.prototype, 'dispose')
  const material = new PBRMaterial('environment-brdf', scene)
  expect(material).toBeDefined()
  const resume = await compiled.promise
  scene.dispose()
  engine.dispose()
  const postprocessBefore = postprocessDispose.mock.calls.length
  const targetBefore = targetDispose.mock.calls.length
  expect(resume).not.toThrow()
  expect(postprocessDispose).toHaveBeenCalledTimes(postprocessBefore + 1)
  expect(targetDispose).toHaveBeenCalledTimes(targetBefore + 1)
})
