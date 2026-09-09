/** @vitest-environment node */
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import {expect, it} from 'vitest'
import {createCameraMovement} from '../camera-movement'

it.each(['KeyW', 'KeyS', 'KeyA', 'KeyD'])('should translate without rotating for %s', (code) => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene)
  const movement = createCameraMovement()
  const before = camera.position.clone()
  movement.press(code)
  movement.update(camera, 1 / 60)
  const offset = camera.position.subtract(before)
  expect(offset.length()).toBeGreaterThan(0)
  expect(Vector3.Distance(offset, camera.target)).toBeLessThan(0.000001)
  expect(camera.radius).toBeCloseTo(2)
  const expected = {KeyA: [-1, 0, 0], KeyD: [1, 0, 0], KeyS: [0, 0, -1], KeyW: [0, 0, 1]}
  expect(
    Vector3.Dot(offset.normalize(), Vector3.FromArray(expected[code as keyof typeof expected])),
  ).toBeCloseTo(1)
  movement.release(code)
  const stopped = camera.position.clone()
  movement.update(camera, 1 / 60)
  expect(camera.position.equals(stopped)).toBe(true)
  movement.press(code)
  movement.clear()
  movement.update(camera, 1 / 60)
  expect(camera.position.equals(stopped)).toBe(true)
  scene.dispose()
  engine.dispose()
})
