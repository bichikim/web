import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {Matrix, Quaternion, Vector3} from '@babylonjs/core/Maths/math.vector'
import {advanceSpring} from './spring-motion'
import {getProfile} from './profiles'

const PHYSICS = {
  drag: 0.22,
  frequency: 60,
  gravity: 0.28,
  hairGravity: 0.035,
  looseAngle: 0.65,
  maxFrame: 0.05,
  radius: 0.01,
  seconds: 1_000,
  stiffness: 0.5,
}
const SEAT_BOUNDS = {max: {x: -0.62, y: 0.6, z: 1.1}, min: {x: -1.5, y: 0.3, z: -1.2}}
const SEAT = {
  max: new Vector3(SEAT_BOUNDS.max.x, SEAT_BOUNDS.max.y, SEAT_BOUNDS.max.z),
  min: new Vector3(SEAT_BOUNDS.min.x, SEAT_BOUNDS.min.y, SEAT_BOUNDS.min.z),
}
const STEP = 1 / PHYSICS.frequency

export const mountGarmentPhysics = (container: AssetContainer, modelUrl: string) => {
  const {rig} = getProfile(modelUrl)
  const nodes = new Map(container.transformNodes.map((node) => [node.name, node]))
  const joints = rig.springs
    .filter((spring) => spring.name !== 'Skirt')
    .flatMap((spring) =>
      spring.joints.slice(0, -1).flatMap((joint, index) => {
        const node = nodes.get(joint.node)
        const child = nodes.get(spring.joints[index + 1].node)
        if (node === undefined || child === undefined) {
          return []
        }
        node.computeWorldMatrix(true)
        child.computeWorldMatrix(true)
        const tail = child.getAbsolutePosition().clone()
        return [
          {
            child,
            current: tail,
            initial: node.rotationQuaternion?.clone() ?? Quaternion.Identity(),
            joint,
            node,
            previous: tail.clone(),
            spring,
          },
        ]
      }),
    )
  let accumulated = 0
  const observer = container.scene.onBeforeRenderObservable.add(() => {
    accumulated += Math.min(
      container.scene.getEngine().getDeltaTime() / PHYSICS.seconds,
      PHYSICS.maxFrame,
    )
    while (accumulated >= STEP) {
      accumulated -= STEP
      for (const state of joints) {
        const {node, child, initial, joint, spring} = state
        node.rotationQuaternion = initial.clone()
        node.computeWorldMatrix(true)
        child.computeWorldMatrix(true)
        const origin = node.getAbsolutePosition().clone()
        const rest = child.getAbsolutePosition().clone()
        const colliders = spring.colliders.flatMap((index) => {
          const collider = rig.colliders[index]
          const parent = nodes.get(collider.node)
          if (parent === undefined) {
            return []
          }
          const world = parent.computeWorldMatrix(true)
          return [
            {
              center: Vector3.TransformCoordinates(Vector3.FromArray(collider.offset), world),
              radius: collider.radius * Math.abs(parent.absoluteScaling.x),
            },
          ]
        })
        const next = advanceSpring({
          colliders,
          current: state.current,
          delta: STEP,
          drag: Math.max(joint.dragForce ?? 0, PHYSICS.drag),
          gravity: Math.max(
            joint.gravityPower ?? 0,
            spring.name === 'Hair' ? PHYSICS.hairGravity : PHYSICS.gravity,
          ),
          length: Vector3.Distance(origin, rest),
          maxAngle: PHYSICS.looseAngle,
          origin,
          previous: state.previous,
          radius: joint.hitRadius ?? PHYSICS.radius,
          rest,
          seat: SEAT,
          segmentCollision: false,
          stiffness: joint.stiffness ?? PHYSICS.stiffness,
        })
        const inverse = Matrix.Invert(node.getWorldMatrix())
        const axis = Vector3.TransformNormal(rest.subtract(origin), inverse).normalize()
        const direction = Vector3.TransformNormal(next.subtract(origin), inverse).normalize()
        const rotation = Quaternion.Identity()
        Quaternion.FromUnitVectorsToRef(axis, direction, rotation)
        node.rotationQuaternion = initial.multiply(rotation)
        node.computeWorldMatrix(true)
        state.previous = state.current
        state.current = next
      }
    }
  })
  return () => {
    container.scene.onBeforeRenderObservable.remove(observer)
    for (const state of joints) {
      state.node.rotationQuaternion = state.initial
    }
  }
}
