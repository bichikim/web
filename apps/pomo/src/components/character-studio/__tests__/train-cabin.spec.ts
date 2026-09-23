/** @vitest-environment node */
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {Scene} from '@babylonjs/core/scene'
import {afterEach, expect, it, vi} from 'vitest'
import {mountTrainCabin} from '../train-cabin'

vi.mock('@babylonjs/core/Loading/sceneLoader', () => ({LoadAssetContainerAsync: vi.fn()}))
vi.mock('../../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))

const engine = new NullEngine()
afterEach(() => {
  engine.scenes.slice().forEach((scene) => scene.dispose())
  vi.clearAllMocks()
})

it('should attach the cabin independently and release it on disposal', async () => {
  const scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 0, 0, 1, Vector3.Zero(), scene)
  const container = new AssetContainer(scene)
  const root = new Mesh('pasted__polySurface114_wallEntrance_0', scene)
  container.meshes.push(root)
  container.rootNodes.push(root)
  const dispose = vi.spyOn(container, 'dispose')
  vi.mocked(LoadAssetContainerAsync).mockResolvedValueOnce(container)
  const onStatus = vi.fn()
  const cleanup = mountTrainCabin({camera, onStatus, scene})
  await vi.waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('ready'))
  expect(root.parent?.name).toBe('train-cabin')
  expect(root.isEnabled()).toBe(true)
  expect(camera.position.z).toBeLessThan(1.05)
  expect(camera.position.z).toBeGreaterThan(-1.3)
  expect(camera.radius).toBeGreaterThan(0.5)
  expect(camera.lowerRadiusLimit).toBe(0.25)
  expect(camera.upperRadiusLimit).toBe(6)
  cleanup()
  expect(dispose).toHaveBeenCalledOnce()
})

it('should dispose a model arriving after cleanup without reporting ready', async () => {
  const scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 0, 0, 1, Vector3.Zero(), scene)
  const container = new AssetContainer(scene)
  const dispose = vi.spyOn(container, 'dispose')
  let resolve: (value: AssetContainer) => void = () => {}
  vi.mocked(LoadAssetContainerAsync).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  const onStatus = vi.fn()
  const cleanup = mountTrainCabin({camera, onStatus, scene})
  cleanup()
  resolve(container)
  await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce())
  expect(onStatus).toHaveBeenCalledTimes(1)
})

it('should report cabin failure without disposing the character scene', async () => {
  const scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 0, 0, 1, Vector3.Zero(), scene)
  vi.mocked(LoadAssetContainerAsync).mockRejectedValueOnce(new Error('download failed'))
  const onStatus = vi.fn()
  const cleanup = mountTrainCabin({camera, onStatus, scene})
  await vi.waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('error'))
  expect(scene.isDisposed).toBe(false)
  cleanup()
})
