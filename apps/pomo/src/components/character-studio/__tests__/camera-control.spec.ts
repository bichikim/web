/** @vitest-environment node */
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Scene} from '@babylonjs/core/scene'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {applyCameraCommand} from '../camera-control'

let engine: NullEngine
let camera: ArcRotateCamera
beforeEach(() => {
  engine = new NullEngine()
  camera = new ArcRotateCamera('test', 0, Math.PI / 2, 5, Vector3.Zero(), new Scene(engine))
  camera.lowerRadiusLimit = 1
  camera.upperRadiusLimit = 10
  camera.storeState()
})
afterEach(() => engine.dispose())

describe('applyCameraCommand', () => {
  it('should keep pan distance consistent when narrowing the lens and moving back', () => {
    applyCameraCommand(camera, {action: 'right'})
    const distance = camera.target.length()
    camera.setTarget(Vector3.Zero())
    camera.fov = 0.35
    camera.radius = (5 * Math.tan(0.8 / 2)) / Math.tan(camera.fov / 2)
    applyCameraCommand(camera, {action: 'right'})
    expect(camera.target.length()).toBeCloseTo(distance)
  })
  it('should pan in screen directions after rotation without changing orbit or distance', () => {
    camera.alpha = Math.PI / 3
    camera.getViewMatrix(true)
    const right = camera.getDirection(Vector3.Right()).normalize()
    applyCameraCommand(camera, {action: 'right'})
    expect(Vector3.Dot(camera.target, right)).toBeGreaterThan(0)
    expect(camera.alpha).toBeCloseTo(Math.PI / 3)
    expect(camera.radius).toBe(5)
    applyCameraCommand(camera, {action: 'left'})
    expect(camera.target.length()).toBeCloseTo(0)
    applyCameraCommand(camera, {action: 'up'})
    expect(camera.target.y).toBeGreaterThan(0)
    applyCameraCommand(camera, {action: 'down'})
    expect(camera.target.length()).toBeCloseTo(0)
  })
  it('should zoom within model bounds and restore the initial view', () => {
    for (let index = 0; index < 50; index += 1) {
      applyCameraCommand(camera, {action: 'zoom-in'})
    }
    expect(camera.radius).toBe(1)
    for (let index = 0; index < 50; index += 1) {
      applyCameraCommand(camera, {action: 'zoom-out'})
    }
    expect(camera.radius).toBe(10)
    applyCameraCommand(camera, {action: 'reset'})
    expect(camera.radius).toBe(5)
  })
  it('should rotate in both directions and stop automatic rotation during manual control', () => {
    applyCameraCommand(camera, {action: 'rotate-left'})
    expect(camera.alpha).toBeLessThan(0)
    applyCameraCommand(camera, {action: 'rotate-right'})
    expect(camera.alpha).toBeCloseTo(0)
    expect(camera.useAutoRotationBehavior).toBe(false)
  })
})
