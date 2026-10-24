/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {Constants} from '@babylonjs/core/Engines/constants'
import {ThinEngine} from '@babylonjs/core/Engines/thinEngine'
import '@babylonjs/core/Engines/Extensions/engine.rawTexture'
import {Observable} from '@babylonjs/core/Misc/observable'
import type {Scene} from '@babylonjs/core/scene'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return {promise, reject, resolve}
}

const createTextureLoad = () => {
  const decoded = deferred<ArrayBufferView[]>()
  const started = deferred<void>()
  const finished = deferred<void>()
  const texture = {
    _hardwareTexture: {} as object | null,
    onLoadedObservable: new Observable(),
    width: 1,
  }
  const pending = new Set<object>()
  const scene = {
    addPendingData: (value: object) => pending.add(value),
    isDisposed: false,
    removePendingData: (value: object) => pending.delete(value),
  }
  let respond!: (buffer: ArrayBuffer) => void
  const engine = {
    _gl: {},
    _internalTexturesCache: [],
    _loadFile: (_url: string, callback: (data: ArrayBuffer) => void) => {
      respond = callback
    },
    createRawCubeTexture: () => texture,
    isDisposed: false,
    updateRawCubeTexture: vi.fn(),
  }
  const loaded = vi.fn(() => finished.resolve())
  const failed = vi.fn((_message?: string, _error?: unknown) => finished.resolve())
  ThinEngine.prototype.createRawCubeTextureFromUrl.call(
    engine as unknown as ThinEngine,
    '/local-environment.exr',
    scene as unknown as Scene,
    1,
    4,
    1,
    true,
    () => {
      started.resolve()
      return decoded.promise
    },
    null,
    loaded,
    failed,
    Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
    false,
  )
  respond(new ArrayBuffer(1))
  return {decoded, engine, failed, finished, loaded, pending, scene, started, texture}
}

it('should upload decoded data and publish load while the owner is active', async () => {
  const load = createTextureLoad()
  await load.started.promise
  load.decoded.resolve([new Float32Array([1, 1, 1])])
  await load.finished.promise
  expect(load.engine.updateRawCubeTexture).toHaveBeenCalledTimes(1)
  expect(load.loaded).toHaveBeenCalledTimes(1)
  expect(load.failed).not.toHaveBeenCalled()
  expect(load.pending.size).toBe(0)
})

it.each(['texture', 'scene', 'engine'] as const)(
  'should cancel a decoded texture and release pending data after %s disposal',
  async (owner) => {
    const load = createTextureLoad()
    await load.started.promise
    if (owner === 'texture') {
      load.texture._hardwareTexture = null
    }
    if (owner === 'scene') {
      load.scene.isDisposed = true
    }
    if (owner === 'engine') {
      load.engine.isDisposed = true
    }
    load.decoded.resolve([new Float32Array([1, 1, 1])])
    await load.finished.promise
    expect(load.engine.updateRawCubeTexture).not.toHaveBeenCalled()
    expect(load.loaded).not.toHaveBeenCalled()
    expect(load.failed).toHaveBeenCalledTimes(1)
    expect(load.failed).toHaveBeenCalledWith(
      'Failed to parse texture data',
      expect.objectContaining({name: 'AbortError'}),
    )
    expect(load.pending.size).toBe(0)
  },
)

it('should preserve the original decode error and release pending data', async () => {
  const load = createTextureLoad()
  const error = new Error('invalid EXR data')
  await load.started.promise
  load.decoded.reject(error)
  await load.finished.promise
  expect(load.failed).toHaveBeenCalledTimes(1)
  expect(load.failed).toHaveBeenCalledWith('Failed to parse texture data', error)
  expect(load.engine.updateRawCubeTexture).not.toHaveBeenCalled()
  expect(load.pending.size).toBe(0)
})
