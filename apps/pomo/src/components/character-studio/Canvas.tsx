import {applySpringSettings, type SpringSettings} from './spring'
import {attachCloth} from './cloth-renderer'
import {applyFaceDeformation, type FaceSettings} from './face-deformation'
import {applyExpressions, type ExpressionSettings} from './expressions'
import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Camera} from '@babylonjs/core/Cameras/camera'
import {Engine} from '@babylonjs/core/Engines/engine'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Color3, Color4} from '@babylonjs/core/Maths/math.color'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {createEffect, createSignal, onCleanup, onMount, Show, untrack} from 'solid-js'

import {applyCameraCommand, type CameraCommand} from './camera-control'

import {reportClientError} from '../../features/client-error-reporter'

interface CharacterCanvasProps {
  readonly springSettings?: SpringSettings
  readonly cameraCommand?: CameraCommand | null
  readonly expressions?: ExpressionSettings
  readonly faceSettings?: FaceSettings
  readonly eyeNarrowing?: number
  readonly modelUrl: string
  readonly onLoadError: () => void
  readonly onLoadProgress: (progress: number) => void
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
}

const MILLISECONDS_PER_SECOND = 1000
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
const LOAD_PROGRESS_SCALE = 100
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

const createCamera = (scene: Scene, renderCanvas: HTMLCanvasElement) => {
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
  camera.attachControl(renderCanvas, true)
  camera.inertia = CAMERA_DEFAULTS.inertia
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = CAMERA_DEFAULTS.wheelDeltaPercentage
  camera.useAutoRotationBehavior = false

  return camera
}

const createRendererEngine = (canvas: HTMLCanvasElement) => {
  try {
    return new Engine(
      canvas,
      true,
      {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
      true,
    )
  } catch (error: unknown) {
    reportClientError(error, {feature: 'character-renderer', source: 'direct'})
    return null
  }
}

const CharacterCanvas = (props: CharacterCanvasProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [clothAvailable, setClothAvailable] = createSignal(false)
  const [clothEnabled, setClothEnabled] = createSignal(true)
  const [windEnabled, setWindEnabled] = createSignal(true)
  const readSpringSettings = () => props.springSettings
  const readFaceSettings = () => props.faceSettings
  const readExpressions = () => props.expressions
  const readEyeNarrowing = () => props.eyeNarrowing ?? 0

  onMount(() => {
    const renderCanvas = canvas()

    if (renderCanvas === null) {
      return
    }

    const engine = createRendererEngine(renderCanvas)
    if (engine === null) {
      props.onLoadError()
      return
    }

    const scene = new Scene(engine)
    scene.clearColor = Color4.FromHexString('#111820ff')

    const camera = createCamera(scene, renderCanvas)

    createEffect(() => {
      const command = props.cameraCommand
      if (command !== null && command !== undefined) {
        applyCameraCommand(camera, command)
      }
    })

    addLighting(scene)

    let activeContainer: AssetContainer | null = null
    let cloth: ReturnType<typeof attachCloth> | null = null
    let loadRevision = 0

    createEffect(() => {
      applySpringSettings(activeContainer, props.springSettings)
      applyFaceDeformation(activeContainer, props.faceSettings)
      applyExpressions(activeContainer, props.expressions)
      applyEyeNarrowing(activeContainer, props.eyeNarrowing ?? 0)
    })

    const unloadModel = () => {
      cloth = null
      setClothAvailable(false)
      activeContainer?.removeAllFromScene()
      activeContainer?.dispose()
      activeContainer = null
    }

    const resizeObserver = new ResizeObserver(() => engine.resize())
    resizeObserver.observe(renderCanvas)
    // eslint-disable-next-line solid/reactivity -- Render callbacks read current settings on every frame.
    engine.runRenderLoop(() => {
      cloth?.update(
        engine.getDeltaTime() / MILLISECONDS_PER_SECOND,
        clothEnabled(),
        windEnabled() ? 1 : 0,
      )
      scene.render()
    })

    createEffect(() => {
      /* eslint-disable prefer-destructuring -- Solid props stay tracked through direct access. */
      const modelUrl = props.modelUrl
      const onLoadError = props.onLoadError
      const onLoadProgress = props.onLoadProgress
      const onLoadStart = props.onLoadStart
      const onLoadSuccess = props.onLoadSuccess
      /* eslint-enable prefer-destructuring */
      loadRevision += 1
      const revision = loadRevision
      unloadModel()
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

          activeContainer = container
          container.addAllToScene()
          cloth = attachCloth(container)
          setClothAvailable(cloth.available)
          applySpringSettings(container, untrack(readSpringSettings))
          applyFaceDeformation(container, untrack(readFaceSettings))
          applyExpressions(container, untrack(readExpressions))
          applyEyeNarrowing(container, untrack(readEyeNarrowing))

          for (const animationGroup of container.animationGroups) {
            animationGroup.start(true)
          }

          fitCamera(camera, scene, container)
          camera.storeState()
          onLoadSuccess()
        })
        .catch((error: unknown) => {
          if (revision !== loadRevision) {
            return
          }

          reportClientError(error, {feature: 'character-model', source: 'direct'})
          unloadModel()
          onLoadError()
        })

      onCleanup(() => {
        if (revision === loadRevision) {
          loadRevision += 1
        }
        unloadModel()
      })
    })

    onCleanup(() => {
      loadRevision += 1
      resizeObserver.disconnect()
      engine.stopRenderLoop()
      unloadModel()
      scene.dispose()
      engine.dispose()
    })
  })

  return (
    <>
      <canvas class="absolute inset-0 h-full w-full touch-none outline-none" ref={setCanvas} />
      <Show when={clothAvailable()}>
        <div class="absolute right-4 top-4 flex gap-2 rounded-xl bg-black/70 p-2 text-sm text-white">
          <button
            type="button"
            class="rounded-lg px-3 py-2 hover:bg-white/15"
            aria-pressed={clothEnabled()}
            onClick={() => setClothEnabled((value) => !value)}
          >
            천 물리 {clothEnabled() ? '켜짐' : '꺼짐'}
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 hover:bg-white/15 disabled:opacity-40"
            disabled={!clothEnabled()}
            aria-pressed={windEnabled()}
            onClick={() => setWindEnabled((value) => !value)}
          >
            바람 {windEnabled() ? '켜짐' : '꺼짐'}
          </button>
        </div>
      </Show>
    </>
  )
}

export default CharacterCanvas
