import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {DefaultRenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'
import {SSAO2RenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline'
import {Engine} from '@babylonjs/core/Engines/engine'
import '@babylonjs/core/Helpers/sceneHelpers'
import {Color3, Color4} from '@babylonjs/core/Maths/math.color'
import {Matrix, Vector3} from '@babylonjs/core/Maths/math.vector'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial'
import {ImageProcessingConfiguration} from '@babylonjs/core/Materials/imageProcessingConfiguration'
import {EXRCubeTexture} from '@babylonjs/core/Materials/Textures/exrCubeTexture'
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder'
import {Scene} from '@babylonjs/core/scene'
import {createSignal, onCleanup, onMount} from 'solid-js'
import '@babylonjs/loaders/glTF'

import {reportClientError} from '../../features/client-error-reporter'
import {CameraControls} from './CameraControls'
import {type LookdevModelStatus, mountLookdevModel} from './lookdev-model'

const ENVIRONMENT_URL = '/assets/3d-world/forest.exr'
const ENVIRONMENT_SIZE = 128
const SHADOW_MAP_SIZE = 2048
const SHADOW_FRUSTUM_SIZE = 6
const SHADOW_BIAS = 0.0001
const SHADOW_NORMAL_BIAS = 0.006
const SHADOW_DARKNESS = 0.38
const SSAO_RATIO = {blurRatio: 0.7, ssaoRatio: 0.7} as const
const SSAO_RADIUS = 1.45
const SSAO_STRENGTH = 1.05
const SSAO_BASE = 0.45
const SSAO_MAX_Z = 10
const SSAO_SAMPLES = 8
const SSAO_BILATERAL_SAMPLES = 8
const VIGNETTE_WEIGHT = 0.9
const BYTE_RANGE = 255
const DITHERING_INTENSITY = 1 / BYTE_RANGE
const THREE = 3
const THREE_POINT_ZERO_FIVE = 3.05
const NEGATIVE_ONE = -1
const CAMERA_ALPHA = -Math.PI / THREE
const CAMERA_BETA = Math.PI / THREE_POINT_ZERO_FIVE
const CAMERA_RADIUS = 6.6
const CAMERA_TARGET_Y = 1.1
const CAMERA_LOWER_BETA = 0.35
const CAMERA_UPPER_BETA = 1.42
const CAMERA_WHEEL_DELTA = 0.02
const CAMERA_INERTIA = 0.78
const CAMERA_ZOOM_IN_FACTOR = 0.8
const CAMERA_ZOOM_OUT_FACTOR = 1.25
const CAMERA_PAN_STEP = 0.35
const CAMERA_MIN_Z = 0.1
const CAMERA_MAX_Z = 2000
const KEY_DIRECTION_X = -0.45
const KEY_DIRECTION_Y = NEGATIVE_ONE
const KEY_DIRECTION_Z = 0.7
const KEY_DIRECTION = new Vector3(KEY_DIRECTION_X, KEY_DIRECTION_Y, KEY_DIRECTION_Z).normalize()
const KEY_POSITION_X = 4.5
const KEY_POSITION_Y = 7
const KEY_POSITION_Z = -5
const KEY_POSITION = new Vector3(KEY_POSITION_X, KEY_POSITION_Y, KEY_POSITION_Z)
const RIM_DIRECTION_X = -0.65
const RIM_DIRECTION_Y = -0.2
const RIM_DIRECTION_Z = -0.45
const RIM_DIRECTION = new Vector3(RIM_DIRECTION_X, RIM_DIRECTION_Y, RIM_DIRECTION_Z).normalize()
const ENVIRONMENT_ROTATION = -Math.PI / THREE
const SKYBOX_SCALE = 1000
const SKYBOX_BLUR = 0.35
const ENVIRONMENT_INTENSITY = 0.14
const RIM_INTENSITY = 0.32
const MODEL_TARGET_POSITION = {x: 0, y: 0, z: 0} as const

type WorldRenderStatus = 'error' | 'loading' | 'ready'

export interface WorldCanvasProps {
  readonly onStatus: (status: WorldRenderStatus) => void
}

const createGroundMaterial = (scene: Scene) => {
  const material = new PBRMaterial('lookdev-ground-material', scene)
  material.albedoColor = Color3.FromHexString('#2a3838')
  material.metallic = 0
  material.roughness = 0.82
  return material
}

const createCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const camera = new ArcRotateCamera(
    'lookdev-camera',
    CAMERA_ALPHA,
    CAMERA_BETA,
    CAMERA_RADIUS,
    new Vector3(0, CAMERA_TARGET_Y, 0),
    scene,
  )
  camera.attachControl(canvas, true)
  camera.lowerRadiusLimit = null
  camera.upperRadiusLimit = null
  camera.lowerBetaLimit = CAMERA_LOWER_BETA
  camera.upperBetaLimit = CAMERA_UPPER_BETA
  camera.panningSensibility = 0
  camera.wheelDeltaPercentage = CAMERA_WHEEL_DELTA
  camera.inertia = CAMERA_INERTIA
  camera.minZ = CAMERA_MIN_Z
  camera.maxZ = CAMERA_MAX_Z
  return camera
}

const zoomCamera = (camera: ArcRotateCamera | null, factor: number) => {
  if (camera === null) {
    return
  }

  camera.radius *= factor
}

const moveCamera = (
  camera: ArcRotateCamera | null,
  horizontalDirection: number,
  verticalDirection: number,
) => {
  if (camera === null) {
    return
  }

  const horizontalMovement = camera
    .getDirection(Vector3.Right())
    .scale(horizontalDirection * CAMERA_PAN_STEP)
  const verticalMovement = camera
    .getDirection(Vector3.Up())
    .scale(verticalDirection * CAMERA_PAN_STEP)
  camera.target.addInPlace(horizontalMovement.add(verticalMovement))
}

const createLighting = (scene: Scene) => {
  const fill = new HemisphericLight('lookdev-fill', Vector3.Up(), scene)
  fill.diffuse = Color3.FromHexString('#c4d8e6')
  fill.groundColor = Color3.FromHexString('#241d25')
  fill.intensity = 0.16

  const key = new DirectionalLight('lookdev-key', KEY_DIRECTION, scene)
  key.position.copyFrom(KEY_POSITION)
  key.diffuse = Color3.FromHexString('#ffe2bd')
  key.intensity = 2
  key.shadowMinZ = 0.1
  key.shadowMaxZ = 20
  key.shadowFrustumSize = SHADOW_FRUSTUM_SIZE

  const shadows = new ShadowGenerator(SHADOW_MAP_SIZE, key)
  shadows.usePercentageCloserFiltering = true
  shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH
  shadows.bias = SHADOW_BIAS
  shadows.normalBias = SHADOW_NORMAL_BIAS
  shadows.darkness = SHADOW_DARKNESS

  const rim = new DirectionalLight('lookdev-rim', RIM_DIRECTION, scene)
  rim.diffuse = Color3.FromHexString('#9fc9ff')
  rim.intensity = RIM_INTENSITY

  return {fill, key, rim, shadows}
}

const createAmbientOcclusion = (scene: Scene, camera: ArcRotateCamera) => {
  if (!SSAO2RenderingPipeline.IsSupported) {
    return null
  }

  try {
    const pipeline = new SSAO2RenderingPipeline('lookdev-ambient-occlusion', scene, SSAO_RATIO, [
      camera,
    ])
    pipeline.radius = SSAO_RADIUS
    pipeline.totalStrength = SSAO_STRENGTH
    pipeline.base = SSAO_BASE
    pipeline.maxZ = SSAO_MAX_Z
    pipeline.samples = SSAO_SAMPLES
    pipeline.expensiveBlur = true
    pipeline.bilateralSamples = SSAO_BILATERAL_SAMPLES
    pipeline.bilateralSoften = 0.35
    pipeline.bilateralTolerance = 0.45
    return pipeline
  } catch (error: unknown) {
    reportClientError(error, {feature: 'world-renderer-effects', source: 'direct'})
    return null
  }
}

const createFinish = (scene: Scene, camera: ArcRotateCamera) => {
  const pipeline = new DefaultRenderingPipeline('lookdev-finish', true, scene, [camera])
  pipeline.fxaaEnabled = true
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 1.35
  pipeline.bloomWeight = 0.05
  pipeline.bloomKernel = 32
  pipeline.sharpenEnabled = true

  const processing = scene.imageProcessingConfiguration
  processing.applyByPostProcess = true
  processing.toneMappingEnabled = true
  processing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  processing.exposure = 0.92
  processing.contrast = 1.1
  processing.vignetteEnabled = true
  processing.vignetteWeight = VIGNETTE_WEIGHT
  processing.vignetteColor = Color4.FromHexString('#071016ff')
  processing.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY
  processing.ditheringEnabled = true
  processing.ditheringIntensity = DITHERING_INTENSITY

  return pipeline
}

const createPostProcessing = (scene: Scene, camera: ArcRotateCamera) => ({
  ambientOcclusion: createAmbientOcclusion(scene, camera),
  finish: createFinish(scene, camera),
})

export function WorldCanvas(props: WorldCanvasProps) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  let activeCamera: ArcRotateCamera | null = null

  const handleMoveDown = () => moveCamera(activeCamera, 0, -1)
  const handleMoveLeft = () => moveCamera(activeCamera, -1, 0)
  const handleMoveRight = () => moveCamera(activeCamera, 1, 0)
  const handleMoveUp = () => moveCamera(activeCamera, 0, 1)
  const handleZoomIn = () => zoomCamera(activeCamera, CAMERA_ZOOM_IN_FACTOR)
  const handleZoomOut = () => zoomCamera(activeCamera, CAMERA_ZOOM_OUT_FACTOR)

  onMount(() => {
    props.onStatus('loading')
    const surface = canvas()

    if (surface === null) {
      props.onStatus('error')
      return
    }

    let engine: Engine
    try {
      engine = new Engine(
        surface,
        true,
        {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
        true,
      )
    } catch (error: unknown) {
      reportClientError(error, {feature: 'world-renderer', source: 'direct'})
      props.onStatus('error')
      return
    }

    const scene = new Scene(engine)
    scene.clearColor = Color4.FromHexString('#0b1016ff')

    const camera = createCamera(scene, surface)
    activeCamera = camera
    scene.activeCamera = camera

    const ground = MeshBuilder.CreateGround(
      'lookdev-ground',
      {height: 14, subdivisions: 2, width: 14},
      scene,
    )
    ground.material = createGroundMaterial(scene)
    ground.receiveShadows = true

    const lighting = createLighting(scene)
    const postProcessing = createPostProcessing(scene, camera)
    let environmentReady = false
    let modelReady = false
    let hasLoadingError = false
    const publishStatus = () => {
      if (hasLoadingError) {
        props.onStatus('error')
      } else if (environmentReady && modelReady) {
        props.onStatus('ready')
      }
    }

    const applyEnvironment = () => {
      scene.environmentIntensity = ENVIRONMENT_INTENSITY
      scene.createDefaultSkybox(environment, true, SKYBOX_SCALE, SKYBOX_BLUR)
      environmentReady = true
      publishStatus()
    }
    const reportEnvironmentError = (message?: string, exception?: unknown) => {
      reportClientError(exception ?? message ?? 'EXR environment texture failed to load', {
        feature: 'world-renderer',
        source: 'direct',
      })
      hasLoadingError = true
      publishStatus()
    }
    const environment = new EXRCubeTexture(
      ENVIRONMENT_URL,
      scene,
      ENVIRONMENT_SIZE,
      false,
      true,
      false,
      true,
      applyEnvironment,
      reportEnvironmentError,
      false,
      true,
    )
    environment.setReflectionTextureMatrix(Matrix.RotationY(ENVIRONMENT_ROTATION))
    scene.environmentTexture = environment
    scene.environmentIntensity = ENVIRONMENT_INTENSITY
    const handleModelStatus = (status: LookdevModelStatus) => {
      switch (status) {
        case 'error':
          hasLoadingError = true
          publishStatus()
          break
        case 'loading':
          break
        case 'ready':
          modelReady = true
          publishStatus()
          break
      }
    }
    const disposeModel = mountLookdevModel({
      onStatus: handleModelStatus,
      scene,
      shadowGenerator: lighting.shadows,
      targetPosition: MODEL_TARGET_POSITION,
    })

    const observer = new ResizeObserver(() => engine.resize())
    observer.observe(surface)
    engine.runRenderLoop(() => scene.render())

    onCleanup(() => {
      activeCamera = null
      observer.disconnect()
      engine.stopRenderLoop()
      disposeModel()
      postProcessing.ambientOcclusion?.dispose()
      postProcessing.finish.dispose()
      lighting.shadows.dispose()
      scene.dispose()
      engine.dispose()
    })
  })

  return (
    <div class="absolute inset-0">
      <canvas
        aria-label="3D 캐릭터 조명 테스트 장면"
        class="absolute inset-0 h-full w-full touch-none outline-none"
        ref={setCanvas}
        tabIndex={0}
      />
      <CameraControls
        onMoveDown={handleMoveDown}
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onMoveUp={handleMoveUp}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
    </div>
  )
}
