import type {AssetContainer} from '@babylonjs/core/assetContainer'
import type {AbstractEngine} from '@babylonjs/core/Engines/abstractEngine'
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Camera} from '@babylonjs/core/Cameras/camera'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Color3, Color4} from '@babylonjs/core/Maths/math.color'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {attachCloth} from './cloth-renderer'
import {applyFaceDeformation, type FaceSettings} from './face-deformation'
import {applyExpressions, type ExpressionSettings} from './expressions'

export interface AppearanceSettings {
  readonly expressions?: ExpressionSettings
  readonly faceSettings?: FaceSettings
  readonly eyeNarrowing?: number
}
interface RendererEvents {
  readonly onStart: () => void
  readonly onReady: () => void
  readonly onError: (error: unknown) => void
  readonly onProgress: (progress: number) => void
  readonly onCloth: (available: boolean) => void
}

const PROGRESS_SCALE = 100
const CAMERA_PADDING = 1.35
const REFERENCE_FOV = 0.8
const CAMERA_ALPHA_DIVISOR = 2
const CAMERA_BETA_DIVISOR = 2
const CAMERA_BOUNDS = {
  farDistanceFactor: 100,
  maximumRadiusFactor: 3,
  minimumFarDistance: 100,
  minimumNearDistance: 0.001,
  minimumRadius: 0.1,
  minimumRadiusFactor: 0.04,
  nearDistanceDivisor: 1_000,
} as const
const CAMERA_DEFAULTS = {
  alpha: Math.PI / CAMERA_ALPHA_DIVISOR,
  beta: Math.PI / CAMERA_BETA_DIVISOR,
  fov: 0.25,
  inertia: 0.8,
  radius: 5,
  wheelDeltaPercentage: 0.01,
} as const
const CENTER_SCALE = 0.5
const AMBIENT_LIGHT_COLOR = '#e6edff'
const AMBIENT_GROUND_COLOR = '#8d7160'
const AMBIENT_LIGHT_INTENSITY = 0.85
const KEY_LIGHT_COLOR = '#ffe1bb'
const KEY_LIGHT_DIRECTION = {x: 0.8, y: -1, z: 0.8} as const
const KEY_LIGHT_INTENSITY = 2.4
const RIM_LIGHT_COLOR = '#fff0d8'
const RIM_LIGHT_DIRECTION = {x: -0.8, y: -0.5, z: -1} as const
const RIM_LIGHT_INTENSITY = 1.2

const applyEyeNarrowing = (container: AssetContainer | null, value: number) => {
  container?.meshes.forEach((mesh) => {
    const manager = mesh.morphTargetManager
    if (manager === null || manager === undefined) {
      return
    }
    for (let index = 0; index < manager.numTargets; index += 1) {
      const target = manager.getTarget(index)
      if (target.name === 'PomoEyeNarrowing') {
        target.influence = value
      }
    }
  })
}

const fitCamera = (camera: ArcRotateCamera, scene: Scene, container: AssetContainer) => {
  const modelMeshes = new Set(container.meshes.filter((mesh) => mesh.getTotalVertices() > 0))

  if (modelMeshes.size === 0) {
    return
  }

  const {max, min} = scene.getWorldExtends((mesh) => modelMeshes.has(mesh))
  const center = min.add(max).scale(CENTER_SCALE)
  const diameter = Vector3.Distance(min, max)

  if (!Number.isFinite(diameter) || diameter <= 0) {
    return
  }

  const distanceScale = Math.tan(REFERENCE_FOV / 2) / Math.tan(CAMERA_DEFAULTS.fov / 2)
  const radius = diameter * CAMERA_PADDING * distanceScale
  camera.setTarget(center)
  camera.alpha = CAMERA_DEFAULTS.alpha
  camera.beta = CAMERA_DEFAULTS.beta
  camera.radius = radius
  camera.lowerRadiusLimit = Math.max(
    diameter * CAMERA_BOUNDS.minimumRadiusFactor * distanceScale,
    CAMERA_BOUNDS.minimumRadius,
  )
  camera.upperRadiusLimit = Math.max(
    diameter * CAMERA_BOUNDS.maximumRadiusFactor * distanceScale,
    camera.lowerRadiusLimit,
  )
  camera.minZ = Math.max(
    diameter / CAMERA_BOUNDS.nearDistanceDivisor,
    CAMERA_BOUNDS.minimumNearDistance,
  )
  camera.maxZ = Math.max(
    diameter * CAMERA_BOUNDS.farDistanceFactor,
    CAMERA_BOUNDS.minimumFarDistance,
  )
}

const addLighting = (scene: Scene) => {
  const ambientLight = new HemisphericLight('ambient-light', new Vector3(0, 1, 0), scene)
  ambientLight.diffuse = Color3.FromHexString(AMBIENT_LIGHT_COLOR)
  ambientLight.groundColor = Color3.FromHexString(AMBIENT_GROUND_COLOR)
  ambientLight.intensity = AMBIENT_LIGHT_INTENSITY

  const keyLight = new DirectionalLight(
    'key-light',
    new Vector3(KEY_LIGHT_DIRECTION.x, KEY_LIGHT_DIRECTION.y, KEY_LIGHT_DIRECTION.z),
    scene,
  )
  keyLight.diffuse = Color3.FromHexString(KEY_LIGHT_COLOR)
  keyLight.intensity = KEY_LIGHT_INTENSITY

  const rimLight = new DirectionalLight(
    'rim-light',
    new Vector3(RIM_LIGHT_DIRECTION.x, RIM_LIGHT_DIRECTION.y, RIM_LIGHT_DIRECTION.z),
    scene,
  )
  rimLight.diffuse = Color3.FromHexString(RIM_LIGHT_COLOR)
  rimLight.intensity = RIM_LIGHT_INTENSITY
}

const createCamera = (scene: Scene) => {
  const camera = new ArcRotateCamera(
    'character-camera',
    CAMERA_DEFAULTS.alpha,
    CAMERA_DEFAULTS.beta,
    CAMERA_DEFAULTS.radius,
    Vector3.Zero(),
    scene,
  )
  camera.mode = Camera.PERSPECTIVE_CAMERA
  camera.fov = CAMERA_DEFAULTS.fov
  camera.inertia = CAMERA_DEFAULTS.inertia
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = CAMERA_DEFAULTS.wheelDeltaPercentage
  camera.useAutoRotationBehavior = false

  return camera
}

/** Owns the scene and model lifetime; the caller owns the engine and render loop. */
export const createCharacterRenderer = (
  engine: AbstractEngine,
  events: RendererEvents,
  loadModel: typeof LoadAssetContainerAsync = LoadAssetContainerAsync,
) => {
  const scene = new Scene(engine)
  scene.clearColor = Color4.FromHexString('#111820ff')
  const camera = createCamera(scene)
  addLighting(scene)
  let active: AssetContainer | null = null
  let cloth: ReturnType<typeof attachCloth> | null = null
  let settings: AppearanceSettings = {}
  let revision = 0
  let disposed = false
  const applyAppearance = () => {
    applyFaceDeformation(active, settings.faceSettings)
    applyExpressions(active, settings.expressions)
    applyEyeNarrowing(active, settings.eyeNarrowing ?? 0)
  }
  const unload = () => {
    cloth = null
    events.onCloth(false)
    active?.removeAllFromScene()
    active?.dispose()
    active = null
  }
  return {
    appearance: (value: AppearanceSettings) => {
      settings = value
      applyAppearance()
    },
    camera,
    dispose: () => {
      if (!disposed) {
        disposed = true
        revision += 1
        unload()
        scene.dispose()
      }
    },
    load: async (url: string) => {
      if (disposed) {
        return
      }
      revision += 1
      const current = revision
      unload()
      events.onStart()
      try {
        const container = await loadModel(url, scene, {
          onProgress: (event) => {
            if (current === revision && event.total > 0) {
              events.onProgress((event.loaded / event.total) * PROGRESS_SCALE)
            }
          },
          pluginExtension: '.glb',
        })
        if (current !== revision) {
          container.dispose()
          return
        }
        active = container
        container.addAllToScene()
        cloth = attachCloth(container)
        events.onCloth(cloth.available)
        applyAppearance()
        for (const animation of container.animationGroups) {
          animation.start(true)
        }
        fitCamera(camera, scene, container)
        camera.storeState()
        events.onReady()
      } catch (error: unknown) {
        if (current === revision) {
          unload()
          events.onError(error)
        }
      }
    },
    render: (elapsed: number, enabled: boolean, wind: number) => {
      if (!disposed) {
        cloth?.update(elapsed, enabled, wind)
        scene.render()
      }
    },
  }
}
