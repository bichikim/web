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
import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

interface CharacterCanvasProps {
  readonly modelUrl: string
  readonly onLoadError: () => void
  readonly onLoadProgress: (progress: number) => void
  readonly onLoadStart: () => void
  readonly onLoadSuccess: () => void
}

const CAMERA_PADDING = 1.35
const CAMERA_ALPHA_DIVISOR = 2.35
const CAMERA_BETA_DIVISOR = 2.3
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

const CharacterCanvas = (props: CharacterCanvasProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)

  onMount(() => {
    const renderCanvas = canvas()

    if (renderCanvas === null) {
      return
    }

    const engine = new Engine(
      renderCanvas,
      true,
      {powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: true},
      true,
    )
    const scene = new Scene(engine)
    scene.clearColor = Color4.FromHexString('#111820ff')

    const camera = new ArcRotateCamera(
      'character-camera',
      CAMERA_DEFAULTS.alpha,
      CAMERA_DEFAULTS.beta,
      CAMERA_DEFAULTS.radius,
      Vector3.Zero(),
      scene,
    )
    camera.attachControl(renderCanvas, true)
    camera.inertia = CAMERA_DEFAULTS.inertia
    camera.panningSensibility = 0
    camera.wheelDeltaPercentage = CAMERA_DEFAULTS.wheelDeltaPercentage
    camera.useAutoRotationBehavior = true

    if (camera.autoRotationBehavior !== null) {
      camera.autoRotationBehavior.idleRotationSpeed = AUTO_ROTATION.speed
      camera.autoRotationBehavior.idleRotationWaitTime = AUTO_ROTATION.waitTime
    }

    const ambientLight = new HemisphericLight('ambient-light', new Vector3(0, 1, 0), scene)
    ambientLight.diffuse = Color3.FromHexString(AMBIENT_LIGHT_COLOR)
    ambientLight.groundColor = Color3.FromHexString(AMBIENT_GROUND_COLOR)
    ambientLight.intensity = AMBIENT_LIGHT_INTENSITY

    const keyLight = new DirectionalLight('key-light', KEY_LIGHT_DIRECTION, scene)
    keyLight.diffuse = Color3.FromHexString(KEY_LIGHT_COLOR)
    keyLight.intensity = KEY_LIGHT_INTENSITY

    let activeContainer: AssetContainer | null = null
    let loadRevision = 0

    const unloadModel = () => {
      activeContainer?.removeAllFromScene()
      activeContainer?.dispose()
      activeContainer = null
    }

    const resizeObserver = new ResizeObserver(() => engine.resize())
    resizeObserver.observe(renderCanvas)
    engine.runRenderLoop(() => scene.render())

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

          for (const animationGroup of container.animationGroups) {
            animationGroup.start(true)
          }

          fitCamera(camera, scene, container)
          onLoadSuccess()
        })
        .catch((error: unknown) => {
          if (revision !== loadRevision) {
            return
          }

          console.error('Babylon.js character model loading failed', error)
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

  return <canvas class="absolute inset-0 h-full w-full touch-none outline-none" ref={setCanvas} />
}

export default CharacterCanvas
