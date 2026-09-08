import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Vector3} from '@babylonjs/core/Maths/math.vector'

const MOVEMENT = {maximumDelta: 0.05, speed: 0.8}
const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD'])

/** Tracks held movement keys and translates the camera with its orbit target. */
export const createCameraMovement = () => {
  const held = new Set<string>()
  return {
    clear: () => held.clear(),
    press(code: string) {
      if (KEYS.has(code)) {
        held.add(code)
        return true
      }
      return false
    },
    release: (code: string) => held.delete(code),
    update(camera: ArcRotateCamera, delta: number) {
      const forwardAmount = Number(held.has('KeyW')) - Number(held.has('KeyS'))
      const rightAmount = Number(held.has('KeyD')) - Number(held.has('KeyA'))
      if (forwardAmount === 0 && rightAmount === 0) {
        return
      }
      const forward = camera.target.subtract(camera.position).normalize()
      const right = Vector3.Cross(camera.upVector, forward).normalize()
      const offset = forward
        .scale(forwardAmount)
        .add(right.scale(rightAmount))
        .normalize()
        .scaleInPlace(MOVEMENT.speed * Math.min(Math.max(delta, 0), MOVEMENT.maximumDelta))
      const position = camera.position.add(offset)
      camera.setTarget(camera.target.add(offset))
      camera.setPosition(position)
    },
  }
}
