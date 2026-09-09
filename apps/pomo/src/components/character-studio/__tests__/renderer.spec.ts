/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {CreateBoxVertexData} from '@babylonjs/core/Meshes/Builders/boxBuilder'
import {MorphTarget} from '@babylonjs/core/Morph/morphTarget'
import {MorphTargetManager} from '@babylonjs/core/Morph/morphTargetManager'
import type {Scene} from '@babylonjs/core/scene'
import {readFileSync} from 'node:fs'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {createCharacterRenderer} from '../renderer'

const engines: NullEngine[] = []
const setup = () => {
  const engine = new NullEngine()
  engines.push(engine)
  const events = {
    onCloth: vi.fn(),
    onError: vi.fn(),
    onProgress: vi.fn(),
    onReady: vi.fn(),
    onStart: vi.fn(),
  }
  const loader = vi.fn<typeof LoadAssetContainerAsync>()
  const renderer = createCharacterRenderer(engine, events, loader)
  return {engine, events, loader, renderer}
}
const createContainer = (scene: Scene, size = 1) => {
  const container = new AssetContainer(scene)
  const mesh = new Mesh('body', scene)
  CreateBoxVertexData({size}).applyToMesh(mesh)
  scene.removeMesh(mesh)
  container.meshes.push(mesh)
  return container
}
afterEach(() => {
  engines.splice(0).forEach((engine) => engine.dispose())
})

describe('createCharacterRenderer', () => {
  it('should construct real cameras and lights, fit a model, render and dispose once', async () => {
    const {engine, renderer, events, loader} = setup()
    const scene = engine.scenes[0]
    const container = createContainer(scene)
    loader.mockResolvedValue(container)
    await renderer.load('/model.glb')
    expect(renderer.camera.fov).toBe(0.25)
    expect(renderer.camera.useAutoRotationBehavior).toBe(false)
    expect(scene.lights.map((light) => light.intensity)).toEqual([0.85, 2.4, 1.2])
    expect(scene.meshes).toContain(container.meshes[0])
    expect(events.onStart).toHaveBeenCalledOnce()
    expect(events.onReady).toHaveBeenCalledOnce()
    expect(renderer.camera.lowerRadiusLimit).toBeGreaterThan(0)
    const radius = renderer.camera.radius
    renderer.camera.radius /= 2
    renderer.camera.restoreState()
    expect(renderer.camera.radius).toBe(radius)
    renderer.render(1 / 60, true, 1)
    const disposed = vi.fn()
    scene.onDisposeObservable.add(disposed)
    renderer.dispose()
    renderer.dispose()
    expect(disposed).toHaveBeenCalledOnce()
    expect(scene.isDisposed).toBe(true)
    expect(engine.isDisposed).toBe(false)
  })

  it('should ignore stale progress and dispose late results after model replacement', async () => {
    const {engine, renderer, events, loader} = setup()
    const first = Promise.withResolvers<AssetContainer>()
    const old = createContainer(engine.scenes[0])
    const current = createContainer(engine.scenes[0])
    loader.mockReturnValueOnce(first.promise).mockResolvedValueOnce(current)
    const pending = renderer.load('/first.glb')
    const progress = loader.mock.calls[0][2]?.onProgress
    progress?.({lengthComputable: true, loaded: 3, total: 4})
    expect(events.onProgress).toHaveBeenCalledWith(75)
    progress?.({lengthComputable: false, loaded: 3, total: 0})
    await renderer.load('/second.glb')
    progress?.({lengthComputable: true, loaded: 1, total: 2})
    first.resolve(old)
    await pending
    expect(events.onProgress).toHaveBeenCalledOnce()
    expect(old.meshes).toHaveLength(0)
    expect(engine.scenes[0].meshes).toContain(current.meshes[0])
    expect(events.onReady).toHaveBeenCalledOnce()
  })

  it('should ignore rejection after disposal and refuse further loading', async () => {
    const {renderer, events, loader} = setup()
    const request = Promise.withResolvers<AssetContainer>()
    loader.mockReturnValue(request.promise)
    const pending = renderer.load('/pending.glb')
    renderer.dispose()
    request.reject(new Error('late failure'))
    await pending
    await renderer.load('/ignored.glb')
    renderer.render(1 / 60, true, 1)
    expect(loader).toHaveBeenCalledOnce()
    expect(events.onError).not.toHaveBeenCalled()
    expect(events.onReady).not.toHaveBeenCalled()
  })

  it('should dispose late successful results after disposal', async () => {
    const {engine, renderer, events, loader} = setup()
    const request = Promise.withResolvers<AssetContainer>()
    const container = createContainer(engine.scenes[0])
    loader.mockReturnValue(request.promise)
    const pending = renderer.load('/pending.glb')
    renderer.dispose()
    request.resolve(container)
    await pending
    expect(container.meshes).toHaveLength(0)
    expect(events.onReady).not.toHaveBeenCalled()
  })

  it('should unload the previous model and report a current loading error', async () => {
    const {engine, renderer, events, loader} = setup()
    const container = createContainer(engine.scenes[0])
    const error = new Error('failed')
    loader.mockResolvedValueOnce(container).mockRejectedValueOnce(error)
    await renderer.load('/first.glb')
    await renderer.load('/second.glb')
    expect(container.meshes).toHaveLength(0)
    expect(events.onError).toHaveBeenCalledWith(error)
    expect(events.onCloth).toHaveBeenLastCalledWith(false)
  })

  it('should attach and reset cloth on the actual runtime GLB', async () => {
    const {engine, renderer, events, loader} = setup()
    const bytes = readFileSync('apps/pomo/public/character-studio/pomo.glb')
    loader.mockImplementation((_source, scene, options) =>
      LoadAssetContainerAsync(bytes, scene, {
        ...options,
        pluginExtension: '.glb',
        pluginOptions: {gltf: {skipMaterials: true}},
      }),
    )
    await renderer.load('/pomo.glb')
    expect(events.onError).not.toHaveBeenCalled()
    expect(events.onCloth).toHaveBeenLastCalledWith(true)
    const mesh = engine.scenes[0].meshes.find((item) => item.name === 'Settled knit sweater')
    const original = Array.from(mesh?.getVerticesData('position') ?? [])
    expect(original.length).toBeGreaterThan(0)
    renderer.render(1 / 60, true, 1)
    expect(Array.from(mesh?.getVerticesData('position') ?? [])).not.toEqual(original)
    renderer.render(1 / 60, false, 0)
    expect(Array.from(mesh?.getVerticesData('position') ?? [])).toEqual(original)
  }, 30000)

  it('should ignore a superseded rejection while keeping the current model', async () => {
    const {engine, renderer, events, loader} = setup()
    const request = Promise.withResolvers<AssetContainer>()
    const current = createContainer(engine.scenes[0])
    loader.mockReturnValueOnce(request.promise).mockResolvedValueOnce(current)
    const pending = renderer.load('/old.glb')
    await renderer.load('/current.glb')
    request.reject(new Error('old failure'))
    await pending
    expect(events.onError).not.toHaveBeenCalled()
    expect(engine.scenes[0].meshes).toContain(current.meshes[0])
  })

  it('should apply the latest appearance after loading and reset it without reloading', async () => {
    const {engine, renderer, loader} = setup()
    const scene = engine.scenes[0]
    const container = createContainer(scene)
    const mesh = container.meshes[0]
    const manager = new MorphTargetManager(scene)
    mesh.morphTargetManager = manager
    const targets = ['Fcl_MTH_A', 'PomoFace:ear-size:plus', 'PomoEyeNarrowing'].map((name) => {
      const target = new MorphTarget(name, 0, scene)
      target.setPositions(Array.from(mesh.getVerticesData('position') ?? []))
      manager.addTarget(target)
      return target
    })
    loader.mockResolvedValue(container)
    const pending = renderer.load('/morph.glb')
    renderer.appearance({
      expressions: {blink: 0, emotion: '', emotionWeight: 1, mouth: 'A', mouthWeight: 0.6},
      eyeNarrowing: 0.3,
      faceSettings: {'ear-size': 0.5},
    })
    await pending
    expect(targets.map((target) => target.influence)).toEqual([0.6, 0.5, 0.3])
    renderer.appearance({})
    expect(targets.map((target) => target.influence)).toEqual([0, 0, 0])
    expect(loader).toHaveBeenCalledOnce()
  })

  it('should skip empty or degenerate bounds and support small and large models', async () => {
    const {engine, renderer, loader} = setup()
    const scene = engine.scenes[0]
    const radius = renderer.camera.radius
    loader.mockResolvedValueOnce(new AssetContainer(scene))
    await renderer.load('/empty.glb')
    expect(renderer.camera.radius).toBe(radius)
    const degenerate = createContainer(scene)
    degenerate.meshes[0].setVerticesData('position', new Float32Array(72))
    loader.mockResolvedValueOnce(degenerate)
    await renderer.load('/degenerate.glb')
    expect(renderer.camera.radius).toBe(radius)
    const invalid = createContainer(scene)
    invalid.meshes[0].setVerticesData('position', new Float32Array(72).fill(Infinity))
    loader.mockResolvedValueOnce(invalid)
    await renderer.load('/invalid.glb')
    expect(renderer.camera.radius).toBe(radius)
    loader.mockResolvedValueOnce(createContainer(scene, 0.01))
    await renderer.load('/small.glb')
    expect(renderer.camera.lowerRadiusLimit).toBe(0.1)
    expect(renderer.camera.minZ).toBe(0.001)
    loader.mockResolvedValueOnce(createContainer(scene, 200))
    await renderer.load('/large.glb')
    expect(renderer.camera.radius).toBeGreaterThan(600)
    expect(renderer.camera.maxZ).toBeGreaterThan(20000)
  })
})
