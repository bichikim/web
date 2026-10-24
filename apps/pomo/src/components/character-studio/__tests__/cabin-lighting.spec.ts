/** @vitest-environment node */
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {CreateBox} from '@babylonjs/core/Meshes/Builders/boxBuilder'
import {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial'
import {expect, it} from 'vitest'
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {createCabinLighting} from '../cabin-lighting'

it('should capture brighter reflections and restore image processing on cleanup', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 0, 1, 3, Vector3.Zero(), scene)
  const exposure = scene.imageProcessingConfiguration.exposure
  const lighting = createCabinLighting(scene)
  lighting.capture(new AssetContainer(scene))
  const probe = scene.reflectionProbes![0]
  expect(probe.cubeTexture.getRenderSize()).toBe(512)
  probe.cubeTexture.onAfterUnbindObservable.notifyObservers(probe.cubeTexture)
  expect(scene.environmentIntensity).toBe(0.8)
  expect(scene.imageProcessingConfiguration.toneMappingEnabled).toBe(true)
  expect(camera._postProcesses.filter(Boolean).length).toBeGreaterThan(0)
  lighting.dispose()
  expect(scene.environmentTexture).toBeNull()
  expect(scene.imageProcessingConfiguration.exposure).toBe(exposure)
  expect(scene.imageProcessingConfiguration.toneMappingEnabled).toBe(false)
  scene.dispose()
  engine.dispose()
})

it('should follow the bulb and enable lit character materials until cleanup', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const lighting = createCabinLighting(scene)
  const bulb = CreateBox('bulb', {}, scene)
  bulb.material = new PBRMaterial('lightBulb', scene)
  const character = CreateBox('character', {}, scene)
  const material = new PBRMaterial('skin', scene)
  material.unlit = true
  character.material = material
  const container = new AssetContainer(scene)
  container.meshes.push(bulb)
  lighting.capture(container)
  bulb.position.x = 2
  scene.onBeforeRenderObservable.notifyObservers(scene)
  expect(scene.getLightByName('cabin-lamp')).toMatchObject({position: {x: 2}})
  expect(material.unlit).toBe(false)
  expect(character.receiveShadows).toBe(true)
  lighting.dispose()
  expect(material.unlit).toBe(true)
  expect(character.receiveShadows).toBe(false)
  scene.dispose()
  engine.dispose()
})

it('should replace studio lighting with warm local light and restore it on cleanup', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const studio = new HemisphericLight('studio', Vector3.Up(), scene)
  const lighting = createCabinLighting(scene)
  expect(studio.isEnabled()).toBe(false)
  const lamp = scene.getLightByName('cabin-lamp')!
  expect(lamp.diffuse.r).toBeGreaterThan(lamp.diffuse.b)
  expect(lamp.getShadowGenerator()).not.toBeNull()
  const daylight = scene.getLightByName('cabin-daylight')!
  expect(daylight.getShadowGenerator()).not.toBeNull()
  expect(daylight.intensity).toBeGreaterThan(0.5)
  expect(scene.getLightByName('cabin-fill')?.intensity).toBeLessThan(0.3)
  lighting.dispose()
  expect(studio.isEnabled()).toBe(true)
  expect(scene.getLightByName('cabin-lamp')).toBeNull()
  expect(scene.getLightByName('cabin-daylight')).toBeNull()
  scene.dispose()
  engine.dispose()
})
