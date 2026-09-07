import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera'
import {Vector3} from '@babylonjs/core/Maths/math.vector'

export type CameraAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate-left'
  | 'rotate-right'
  | 'reset'

export interface CameraCommand {
  readonly action: CameraAction
}

const PAN_FACTOR = 0.08
const REFERENCE_FOV = 0.8
const ZOOM_FACTOR = 1.2
const ROTATION_DIVISOR = 12
const ROTATION_STEP = Math.PI / ROTATION_DIVISOR

const panCamera = (camera: ArcRotateCamera, axis: Vector3) => {
  camera.getViewMatrix(true)
  const offset = camera
    .getDirection(axis)
    .normalize()
    .scale(camera.radius * PAN_FACTOR * (Math.tan(camera.fov / 2) / Math.tan(REFERENCE_FOV / 2)))
  camera.setTarget(camera.target.add(offset), false, true, true)
}

export const applyCameraCommand = (camera: ArcRotateCamera, command: CameraCommand) => {
  camera.useAutoRotationBehavior = false
  camera.inertialAlphaOffset = 0
  camera.inertialBetaOffset = 0
  camera.inertialRadiusOffset = 0
  camera.inertialPanningX = 0
  camera.inertialPanningY = 0
  switch (command.action) {
    case 'up':
      panCamera(camera, Vector3.Up())
      return
    case 'down':
      panCamera(camera, Vector3.Down())
      return
    case 'left':
      panCamera(camera, Vector3.Left())
      return
    case 'right':
      panCamera(camera, Vector3.Right())
      return
    case 'zoom-in':
      camera.radius = Math.max(camera.lowerRadiusLimit ?? camera.minZ, camera.radius / ZOOM_FACTOR)
      return
    case 'zoom-out':
      camera.radius = Math.min(camera.upperRadiusLimit ?? camera.maxZ, camera.radius * ZOOM_FACTOR)
      return
    case 'rotate-left':
      camera.alpha -= ROTATION_STEP
      return
    case 'rotate-right':
      camera.alpha += ROTATION_STEP
      return
    case 'reset':
      camera.restoreState()
      return
    default: {
      const exhaustive: never = command.action
      return exhaustive
    }
  }
}
