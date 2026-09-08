import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Engine} from '@babylonjs/core/Engines/engine'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Color3, Color4} from '@babylonjs/core/Maths/math.color'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {createEffect, createSignal, onCleanup, onMount, untrack} from 'solid-js'

import {reportClientError} from '../../features/client-error-reporter'
import {applyExpressions, type ExpressionSettings} from './expressions'
import {applyFaceDeformation, type FaceSettings} from './face-deformation'
import {type CabinStatus, mountTrainCabin} from './train-cabin'
import {useSeatedCharacters} from './use-seated-characters'
import {createCameraMovement} from './camera-movement'

interface TrainCanvasProps {
  readonly autoRotate?: boolean
  readonly cacheModels?: boolean
  readonly expressions?: ExpressionSettings
  readonly faceSettings?: FaceSettings
  readonly modelUrl: string
  readonly trainCabin?: boolean
  readonly seatedCharacters?: readonly string[]
  readonly onCabinStatus?: (status: CabinStatus) => void
  readonly onLoadError: () => void
  readonly onLoadProgress: (progress: number) => void
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
}

const CAMERA_PADDING = 1.35
const CAMERA_ALPHA_DIVISOR = 2
const CAMERA_BETA_DIVISOR = 2
const CAMERA_BOUNDS = {
  farDistanceFactor: 100,
  maximumRadiusFactor: 3,
  minimumFarDistance: 100,
  minimumNearDistance: 0.01,
  minimumRadius: 0.1,
  minimumRadiusFactor: 0.4,
  nearDistanceDivisor: 1_000,
} as const
const CAMERA_DEFAULTS = {
  alpha: Math.PI / CAMERA_ALPHA_DIVISOR,
  beta: Math.PI / CAMERA_BETA_DIVISOR,
  inertia: 0.8,
  radius: 5,
  wheelDeltaPercentage: 0.01,
} as const
const CENTER_SCALE = 0.5
const LOAD_PROGRESS_SCALE = 100
const AMBIENT_LIGHT_COLOR = '#e8f7ff'
const AMBIENT_GROUND_COLOR = '#241f33'
const AMBIENT_LIGHT_INTENSITY = 1.8
const AUTO_ROTATION = {speed: 0.08, waitTime: 2_500} as const
const KEY_LIGHT_COLOR = '#fff2e3'
const KEY_LIGHT_DIRECTION = Vector3.Left().add(Vector3.Down()).add(Vector3.Backward())
const KEY_LIGHT_INTENSITY = 2.2

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

  const radius = diameter * CAMERA_PADDING
  camera.setTarget(center)
  camera.radius = radius
  camera.lowerRadiusLimit = Math.max(
    diameter * CAMERA_BOUNDS.minimumRadiusFactor,
    CAMERA_BOUNDS.minimumRadius,
  )
  camera.upperRadiusLimit = Math.max(
    diameter * CAMERA_BOUNDS.maximumRadiusFactor,
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

const createLights = (scene: Scene) => {
  const ambientLight = new HemisphericLight('ambient-light', new Vector3(0, 1, 0), scene)
  ambientLight.diffuse = Color3.FromHexString(AMBIENT_LIGHT_COLOR)
  ambientLight.groundColor = Color3.FromHexString(AMBIENT_GROUND_COLOR)
  ambientLight.intensity = AMBIENT_LIGHT_INTENSITY
  const keyLight = new DirectionalLight('key-light', KEY_LIGHT_DIRECTION, scene)
  keyLight.diffuse = Color3.FromHexString(KEY_LIGHT_COLOR)
  keyLight.intensity = KEY_LIGHT_INTENSITY
}

const configureRotation = (camera: ArcRotateCamera, enabled: boolean) => {
  camera.useAutoRotationBehavior = enabled
  const behavior = camera.autoRotationBehavior
  if (behavior !== null && behavior !== undefined) {
    behavior.idleRotationSpeed = AUTO_ROTATION.speed
    behavior.idleRotationWaitTime = AUTO_ROTATION.waitTime
  }
}

const createCamera = (
  scene: Scene,
  canvas: HTMLCanvasElement,
  movement: ReturnType<typeof createCameraMovement>,
) => {
  const camera = new ArcRotateCamera(
    'character-camera',
    CAMERA_DEFAULTS.alpha,
    CAMERA_DEFAULTS.beta,
    CAMERA_DEFAULTS.radius,
    Vector3.Zero(),
    scene,
  )
  camera.attachControl(canvas, true)
  camera.inertia = CAMERA_DEFAULTS.inertia
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = CAMERA_DEFAULTS.wheelDeltaPercentage
  const milliseconds = 1000
  scene.onBeforeRenderObservable.add(() => {
    if (canvas.ownerDocument.hasFocus()) {
      movement.update(camera, scene.getEngine().getDeltaTime() / milliseconds)
    } else {
      movement.clear()
    }
  })
  return camera
}

const createEngine = (canvas: HTMLCanvasElement, onError: () => void) => {
  try {
    return new Engine(
      canvas,
      true,
      {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
      true,
    )
  } catch (error: unknown) {
    reportClientError(error, {feature: 'character-renderer', source: 'direct'})
    onError()
    return undefined
  }
}

export const TrainCanvas = (props: TrainCanvasProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const movement = createCameraMovement()

  onMount(() => {
    const renderCanvas = canvas()

    if (renderCanvas === null) {
      return
    }

    const engine = createEngine(renderCanvas, () => props.onLoadError())
    if (engine === undefined) {
      return
    }

    const scene = new Scene(engine)
    scene.clearColor = Color4.FromHexString('#111820ff')

    const camera = createCamera(scene, renderCanvas, movement)
    createEffect(() => configureRotation(camera, props.autoRotate ?? true))

    createLights(scene)

    createEffect(() => {
      if (props.trainCabin) {
        const dispose = untrack(() =>
          mountTrainCabin({
            camera,
            onStatus: (status) => props.onCabinStatus?.(status),
            scene,
          }),
        )
        onCleanup(dispose)
      }
    })

    let activeContainer: AssetContainer | null = null
    const modelCache = new Map<string, AssetContainer>()
    let loadRevision = 0

    const applyAppearance = () => {
      applyExpressions(activeContainer, props.expressions)
      applyFaceDeformation(activeContainer, props.faceSettings)
    }
    createEffect(applyAppearance)

    useSeatedCharacters(scene, props)

    const unloadModel = () => {
      for (const animation of activeContainer?.animationGroups ?? []) {
        animation.pause()
      }
      activeContainer?.removeAllFromScene()
      if (activeContainer !== null && ![...modelCache.values()].includes(activeContainer)) {
        activeContainer.dispose()
      }
      activeContainer = null
    }

    const resizeObserver = new ResizeObserver(() => engine.resize())
    resizeObserver.observe(renderCanvas)
    engine.runRenderLoop(() => scene.render())

    createEffect(() => {
      if (props.seatedCharacters !== undefined) {
        return
      }
      /* eslint-disable prefer-destructuring -- Solid props stay tracked through direct access. */
      const modelUrl = props.modelUrl
      const cacheModels = props.cacheModels
      const onLoadError = props.onLoadError
      const onLoadProgress = props.onLoadProgress
      const onLoadStart = props.onLoadStart
      const onLoadSuccess = props.onLoadSuccess
      /* eslint-enable prefer-destructuring */
      loadRevision += 1
      const revision = loadRevision
      unloadModel()

      onCleanup(() => {
        if (revision === loadRevision) {
          loadRevision += 1
        }
        unloadModel()
      })

      const showModel = (container: AssetContainer) => {
        activeContainer = container
        container.addAllToScene()
        untrack(applyAppearance)
        for (const animationGroup of container.animationGroups) {
          animationGroup.start(true)
        }
        if (!untrack(() => props.trainCabin)) {
          fitCamera(camera, scene, container)
        }
        onLoadSuccess()
      }
      const cached = modelCache.get(modelUrl)
      if (cached !== undefined) {
        showModel(cached)
        return
      }
      onLoadStart()

      LoadAssetContainerAsync(modelUrl, scene, {
        onProgress: (event) => {
          if (revision === loadRevision && event.total > 0) {
            onLoadProgress((event.loaded / event.total) * LOAD_PROGRESS_SCALE)
          }
        },
        pluginExtension: '.glb',
      })
        .then((container) => {
          if (revision !== loadRevision) {
            container.dispose()
            return
          }

          if (cacheModels) {
            modelCache.set(modelUrl, container)
          }
          showModel(container)
        })
        .catch((error: unknown) => {
          if (revision !== loadRevision) {
            return
          }

          reportClientError(error, {feature: 'character-model', source: 'direct'})
          unloadModel()
          onLoadError()
        })
    })

    onCleanup(() => {
      loadRevision += 1
      resizeObserver.disconnect()
      engine.stopRenderLoop()
      unloadModel()
      for (const container of modelCache.values()) {
        container.dispose()
      }
      modelCache.clear()
      scene.dispose()
      engine.dispose()
    })
  })

  return (
    <canvas
      class="absolute inset-0 h-full w-full touch-none outline-none"
      ref={setCanvas}
      tabIndex={0}
      aria-label="3D 장면 · WASD 이동, 마우스 드래그 시점 회전"
      onPointerDown={(event) => event.currentTarget.focus()}
      onBlur={() => movement.clear()}
      onKeyDown={(event) => {
        if (!event.ctrlKey && !event.metaKey && !event.altKey && movement.press(event.code)) {
          event.preventDefault()
        }
      }}
      onKeyUp={(event) => {
        if (movement.release(event.code)) {
          event.preventDefault()
        }
      }}
    />
  )
}
