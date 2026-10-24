import type {AssetContainer} from '@babylonjs/core/assetContainer'
import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import type {Scene} from '@babylonjs/core/scene'
import {reportClientError} from '../../features/client-error-reporter'
import {createCabinLighting} from './cabin-lighting'

export type CabinStatus = 'loading' | 'ready' | 'error'

interface CabinOptions {
  readonly scene: Scene
  readonly camera: ArcRotateCamera
  readonly onStatus?: (status: CabinStatus) => void
}

const CABIN_SCALE = 17
const CABIN_CENTER = 0.3235
const CAMERA_TARGET = {x: -1.1, y: 0.95, z: 0}
const CAMERA_POSITION = {x: 0.65, y: 1.5, z: 0.25}

export const mountTrainCabin = (options: CabinOptions) => {
  let disposed = false
  let container: AssetContainer | null = null
  const root = new TransformNode('train-cabin', options.scene)
  const lighting = createCabinLighting(options.scene)
  root.scaling.setAll(CABIN_SCALE)
  root.position.set(CABIN_CENTER * CABIN_SCALE, 0, 0)
  options.camera.setTarget(new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z))
  options.camera.setPosition(new Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z))
  options.camera.fov = 1.05
  options.camera.lowerRadiusLimit = 0.25
  options.camera.upperRadiusLimit = 6
  options.camera.minZ = 0.01
  options.camera.maxZ = 100
  options.onStatus?.('loading')

  LoadAssetContainerAsync('/assets/train-cabin/scene.glb', options.scene, {pluginExtension: '.glb'})
    .then((loaded) => {
      if (disposed) {
        loaded.dispose()
        return
      }
      container = loaded
      loaded.addAllToScene()
      for (const node of loaded.rootNodes) {
        node.parent = root
      }
      for (const animation of loaded.animationGroups) {
        animation.start(true)
      }
      lighting.capture(loaded)
      options.onStatus?.('ready')
    })
    .catch((error: unknown) => {
      if (!disposed) {
        reportClientError(error, {feature: 'train-cabin', source: 'direct'})
        options.onStatus?.('error')
      }
    })

  return () => {
    disposed = true
    lighting.dispose()
    container?.dispose()
    root.dispose()
  }
}
