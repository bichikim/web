import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import type {Scene} from '@babylonjs/core/scene'
import type {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import {reportClientError} from '../../features/client-error-reporter'

const MODEL_URL = '/assets/3d-world/hinata-model.glb'
const CENTER_SCALE = 0.5
const MODEL_SCALE = 2.4
const MODEL_ROTATION_Y = Math.PI

export type LookdevModelStatus = 'error' | 'loading' | 'ready'

interface LookdevModelOptions {
  readonly onStatus?: (status: LookdevModelStatus) => void
  readonly scene: Scene
  readonly shadowGenerator: ShadowGenerator
  readonly targetPosition: {x: number; y: number; z: number}
}

const positionModel = (
  root: TransformNode,
  scene: Scene,
  meshes: AssetContainer['meshes'],
  target: LookdevModelOptions['targetPosition'],
) => {
  const modelMeshes = new Set(meshes.filter((mesh) => mesh.getTotalVertices() > 0))

  if (modelMeshes.size === 0) {
    return
  }

  root.computeWorldMatrix(true)
  const {max, min} = scene.getWorldExtends((mesh) => modelMeshes.has(mesh))
  const center = min.add(max).scale(CENTER_SCALE)
  root.position.x += target.x - center.x
  root.position.y += target.y - min.y
  root.position.z += target.z - center.z
}

export const mountLookdevModel = (options: LookdevModelOptions) => {
  let disposed = false
  let container: AssetContainer | null = null
  const root = new TransformNode('lookdev-hinata-model', options.scene)
  root.scaling.setAll(MODEL_SCALE)
  root.rotation.y = MODEL_ROTATION_Y
  root.position.set(options.targetPosition.x, options.targetPosition.y, options.targetPosition.z)
  options.onStatus?.('loading')

  LoadAssetContainerAsync(MODEL_URL, options.scene, {pluginExtension: '.glb'})
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
      positionModel(root, options.scene, loaded.meshes, options.targetPosition)
      for (const mesh of loaded.meshes) {
        if (mesh.getTotalVertices() > 0) {
          mesh.receiveShadows = true
          options.shadowGenerator.addShadowCaster(mesh)
        }
      }
      options.onStatus?.('ready')
    })
    .catch((error: unknown) => {
      if (!disposed) {
        reportClientError(error, {feature: 'world-model', source: 'direct'})
        options.onStatus?.('error')
      }
    })

  return () => {
    disposed = true
    container?.dispose()
    root.dispose()
  }
}
