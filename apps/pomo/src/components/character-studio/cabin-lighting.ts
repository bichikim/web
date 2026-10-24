import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {PointLight} from '@babylonjs/core/Lights/pointLight'
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight'
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import {Color3} from '@babylonjs/core/Maths/math.color'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {ReflectionProbe} from '@babylonjs/core/Probes/reflectionProbe'
import type {Scene} from '@babylonjs/core/scene'
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial'
import {ImageProcessingConfiguration} from '@babylonjs/core/Materials/imageProcessingConfiguration'
import {DefaultRenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'

const SETTINGS = {
  daylight: {intensity: 3.2, x: -0.4, y: 3, z: -4},
  daylightDirection: {x: 0.4, y: -0.5, z: 1},
  fill: 0.1,
  lamp: {intensity: 0.9, range: 5, x: -0.06, y: 1.73, z: -0.16},
  reflectionHeight: 1.2,
  reflectionIntensity: 0.8,
  reflectionSize: 512,
  shadowSize: 1024,
  window: {intensity: 0.35, range: 4, x: 0, y: 1.65, z: -1.2},
} as const

const createDaylight = (scene: Scene) => {
  const daylight = new DirectionalLight(
    'cabin-daylight',
    new Vector3(
      SETTINGS.daylightDirection.x,
      SETTINGS.daylightDirection.y,
      SETTINGS.daylightDirection.z,
    ).normalize(),
    scene,
  )
  daylight.position.set(SETTINGS.daylight.x, SETTINGS.daylight.y, SETTINGS.daylight.z)
  daylight.diffuse = Color3.FromHexString('#fff1d6')
  daylight.intensity = SETTINGS.daylight.intensity
  daylight.shadowMinZ = 0.1
  daylight.shadowMaxZ = 15
  daylight.shadowFrustumSize = 5
  const daylightShadows = new ShadowGenerator(SETTINGS.shadowSize, daylight)
  daylightShadows.usePercentageCloserFiltering = true
  daylightShadows.bias = 0.0001
  daylightShadows.normalBias = 0.005
  const daylightMap = daylightShadows.getShadowMap()
  if (daylightMap !== null) {
    daylightMap.renderListPredicate = (mesh) =>
      !/movingBackground|windows/u.test(mesh.material?.name ?? mesh.name)
  }
  return () => {
    daylightShadows.dispose()
    daylight.dispose()
  }
}

const createFinish = (scene: Scene) => {
  const processing = scene.imageProcessingConfiguration
  const previousProcessing = {
    applyByPostProcess: processing.applyByPostProcess,
    exposure: processing.exposure,
    toneMappingEnabled: processing.toneMappingEnabled,
    toneMappingType: processing.toneMappingType,
  }
  const pipeline = new DefaultRenderingPipeline('cabin-finish', true, scene, scene.cameras)
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 1
  pipeline.bloomWeight = 0.18
  pipeline.bloomKernel = 48
  pipeline.fxaaEnabled = true
  processing.toneMappingEnabled = true
  processing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  processing.exposure = 1.15
  return () => {
    pipeline.dispose()
    Object.assign(processing, previousProcessing)
  }
}

export const createCabinLighting = (scene: Scene) => {
  const disposeFinish = createFinish(scene)
  const previous = scene.lights.map((light) => ({enabled: light.isEnabled(), light}))
  previous.forEach(({light}) => light.setEnabled(false))
  const environment = scene.environmentTexture
  const intensity = scene.environmentIntensity
  const fill = new HemisphericLight('cabin-fill', Vector3.Up(), scene)
  fill.diffuse = Color3.FromHexString('#b7c9e6')
  fill.groundColor = Color3.FromHexString('#342139')
  fill.intensity = SETTINGS.fill
  const lamp = new PointLight(
    'cabin-lamp',
    new Vector3(SETTINGS.lamp.x, SETTINGS.lamp.y, SETTINGS.lamp.z),
    scene,
  )
  lamp.diffuse = Color3.FromHexString('#ffce88')
  lamp.intensity = SETTINGS.lamp.intensity
  lamp.range = SETTINGS.lamp.range
  const window = new PointLight(
    'cabin-window',
    new Vector3(SETTINGS.window.x, SETTINGS.window.y, SETTINGS.window.z),
    scene,
  )
  window.diffuse = Color3.FromHexString('#c3dbff')
  window.intensity = SETTINGS.window.intensity
  window.range = SETTINGS.window.range
  const disposeDaylight = createDaylight(scene)
  const shadows = new ShadowGenerator(SETTINGS.shadowSize, lamp)
  shadows.usePoissonSampling = true
  shadows.bias = 0.0001
  shadows.normalBias = 0.005
  const map = shadows.getShadowMap()
  if (map !== null) {
    map.renderListPredicate = (mesh) =>
      !/movingBackground|lightBulb|lightSource|windows/u.test(mesh.material?.name ?? mesh.name)
  }
  const receivers = new Map<AbstractMesh, boolean>()
  const receive = (mesh: AbstractMesh) => {
    if (!receivers.has(mesh)) {
      receivers.set(mesh, mesh.receiveShadows)
    }
    mesh.receiveShadows = true
  }
  scene.meshes.forEach(receive)
  const observer = scene.onNewMeshAddedObservable.add(receive)
  let probe: ReflectionProbe | null = null
  let bulb: Mesh | undefined
  const materials = new Map<PBRMaterial, boolean>()
  const tracking = scene.onBeforeRenderObservable.add(() => {
    scene.meshes.forEach(receive)
    if (bulb !== undefined) {
      bulb.skeleton?.prepare()
      bulb.computeWorldMatrix(true)
      bulb.refreshBoundingInfo(true)
      lamp.position.copyFrom(bulb.getBoundingInfo().boundingBox.centerWorld)
    }
    for (const material of scene.materials) {
      if (material instanceof PBRMaterial && material.unlit) {
        materials.set(material, true)
        material.unlit = false
      }
    }
  })

  return {
    capture: (container: AssetContainer) => {
      bulb = container.meshes.find(
        (mesh): mesh is Mesh => mesh instanceof Mesh && mesh.material?.name === 'lightBulb',
      )
      probe?.dispose()
      probe = new ReflectionProbe('cabin-reflection', SETTINGS.reflectionSize, scene, true, true)
      probe.position.set(0, SETTINGS.reflectionHeight, 0)
      probe.renderList = container.meshes
      probe.refreshRate = 0
      const texture = probe.cubeTexture
      texture.onAfterUnbindObservable.addOnce(() => {
        scene.environmentTexture = texture
        scene.environmentIntensity = SETTINGS.reflectionIntensity
      })
    },
    dispose: () => {
      disposeFinish()
      scene.onBeforeRenderObservable.remove(tracking)
      materials.forEach((unlit, material) => {
        material.unlit = unlit
      })
      scene.onNewMeshAddedObservable.remove(observer)
      receivers.forEach((value, mesh) => {
        mesh.receiveShadows = value
      })
      scene.environmentTexture = environment
      scene.environmentIntensity = intensity
      probe?.dispose()
      shadows.dispose()
      disposeDaylight()
      lamp.dispose()
      window.dispose()
      fill.dispose()
      previous.forEach(({light, enabled}) => light.setEnabled(enabled))
    },
  }
}
