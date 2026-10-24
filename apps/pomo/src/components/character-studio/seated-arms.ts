import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {Matrix, Quaternion, Vector3} from '@babylonjs/core/Maths/math.vector'
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import type {sampleSeatedAction} from './seated-actions'

const POSE = {
  curl: 0.25,
  fingerClose: 0.2,
  fingerOpen: 0.75,
  gestureWrist: -0.6,
  gestureY: 0.2,
  gestureZ: 0.07,
  handsStack: 0.025,
  handsX: 0.075,
  handsY: 0.03,
  lapX: 0.105,
  lapY: 0.04,
  lapZ: 0.22,
  poleX: 0.12,
  poleY: -0.3,
  poleZ: 0.1,
  reach: 0.98,
  skirtLapY: 0.14,
  wrist: 0.65,
}

const FINGERS = {
  baseCurl: 0.85,
  curl: 0.055,
  digitCurl: 0.08,
  digitPhase: 0.4,
  drift: 0.025,
  driftSpeed: 0.61,
  flex: 0.48,
  handPhase: 1.3,
  jointFalloff: 0.12,
  settlePower: 4,
  settleSpeed: 0.45,
  speed: 1.15,
  spread: 0.035,
  thumbFlex: 0.45,
} as const

const aim = (node: TransformNode, child: TransformNode, target: Vector3) => {
  const world = node.computeWorldMatrix(true)
  child.computeWorldMatrix(true)
  const inverse = Matrix.Invert(world)
  const axis = Vector3.TransformNormal(
    child.getAbsolutePosition().subtract(node.getAbsolutePosition()),
    inverse,
  ).normalize()
  const direction = Vector3.TransformNormal(
    target.subtract(node.getAbsolutePosition()),
    inverse,
  ).normalize()
  const swing = Quaternion.Identity()
  Quaternion.FromUnitVectorsToRef(axis, direction, swing)
  node.rotationQuaternion = (node.rotationQuaternion ?? Quaternion.Identity()).multiply(swing)
  node.computeWorldMatrix(true)
}

const thumbAxes = (container: AssetContainer) =>
  new Map(
    container.transformNodes
      .filter((node) => /J_Bip_[LR]_Thumb[123]$/u.test(node.name))
      .map((node) => {
        const sign = node.name.includes('_L_') ? 1 : -1
        const hand = container.transformNodes.find(
          (item) => item.name === node.name.replace(/Thumb[123]$/u, 'Hand'),
        )
        if (hand === undefined) {
          return [node, new Vector3(0, 0, -sign)] as const
        }
        const palm = Vector3.TransformNormal(Vector3.Down(), hand.computeWorldMatrix(true))
        const local = Vector3.TransformNormal(
          palm,
          Matrix.Invert(node.computeWorldMatrix(true)),
        ).normalize()
        return [node, Vector3.Cross(new Vector3(sign, 0, 0), local).normalize()] as const
      }),
  )

export const createSeatedArms = (container: AssetContainer) => {
  const find = (name: string) => container.transformNodes.find((node) => node.name === name)
  const hips = find('J_Bip_C_Hips')
  const lapHeight = container.transformNodes.some((node) => node.name.includes('SkirtFront'))
    ? POSE.skirtLapY
    : POSE.lapY
  const originals = new Map<TransformNode, Quaternion | null>()
  const arms = ['L', 'R'].flatMap((side) => {
    const upper = find(`J_Bip_${side}_UpperArm`)
    const lower = find(`J_Bip_${side}_LowerArm`)
    const hand = find(`J_Bip_${side}_Hand`)
    if (upper === undefined || lower === undefined || hand === undefined) {
      return []
    }
    for (const node of [upper, lower, hand]) {
      originals.set(node, node.rotationQuaternion?.clone() ?? null)
    }
    return [{hand, lower, sign: side === 'L' ? 1 : -1, upper}]
  })
  const fingers = container.transformNodes.filter((node) =>
    /J_Bip_[LR]_(?:Index|Middle|Ring|Little|Thumb)[123]$/u.test(node.name),
  )
  fingers.forEach((node) => originals.set(node, node.rotationQuaternion?.clone() ?? null))
  const axes = thumbAxes(container)
  return {
    dispose: () =>
      originals.forEach((rotation, node) => {
        node.rotationQuaternion = rotation
      }),
    update: (action: ReturnType<typeof sampleSeatedAction>, elapsed = 0) => {
      for (const node of fingers) {
        const sign = node.name.includes('_L_') ? 1 : -1
        const thumb = node.name.includes('Thumb')
        const digit = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'].findIndex((name) =>
          node.name.includes(name),
        )
        const joint = Number(node.name.slice(-1))
        const phase =
          elapsed * FINGERS.speed + digit * FINGERS.digitPhase + sign * FINGERS.handPhase
        const settling =
          Math.sin(elapsed * FINGERS.settleSpeed + sign - digit * FINGERS.digitPhase) **
          FINGERS.settlePower
        const idle =
          Math.sin(phase) * FINGERS.curl + Math.sin(phase * FINGERS.driftSpeed) * FINGERS.drift
        const opening = sign < 0 ? action.gesture : 0
        const amount = 1 - opening * POSE.fingerOpen + action.hands * POSE.fingerClose
        const flex = (idle + settling * FINGERS.flex) * (1 - opening * POSE.fingerOpen)
        const bend = (POSE.curl * amount + flex) * (1 - (joint - 1) * FINGERS.jointFalloff)
        const curl = thumb
          ? Quaternion.RotationAxis(axes.get(node)!, bend * FINGERS.thumbFlex)
          : Quaternion.FromEulerAngles(
              0,
              joint === 1 ? sign * Math.sin(phase) * FINGERS.spread : 0,
              -sign * bend * (FINGERS.baseCurl + digit * FINGERS.digitCurl),
            )
        node.rotationQuaternion = (originals.get(node) ?? Quaternion.Identity()).multiply(curl)
      }
      if (hips === undefined) {
        return
      }
      const hipWorld = hips.computeWorldMatrix(true)
      for (const arm of arms) {
        const {upper, lower, hand, sign} = arm
        upper.rotationQuaternion = originals.get(upper)?.clone() ?? Quaternion.Identity()
        lower.rotationQuaternion = originals.get(lower)?.clone() ?? Quaternion.Identity()
        const gesturing = sign < 0 ? action.gesture : 0
        const target = Vector3.TransformCoordinates(
          new Vector3(
            sign * (POSE.lapX - action.hands * POSE.handsX),
            lapHeight +
              gesturing * POSE.gestureY +
              action.hands * (POSE.handsY + (sign > 0 ? POSE.handsStack : 0)),
            POSE.lapZ + gesturing * POSE.gestureZ,
          ),
          hipWorld,
        )
        upper.computeWorldMatrix(true)
        lower.computeWorldMatrix(true)
        hand.computeWorldMatrix(true)
        const shoulder = upper.getAbsolutePosition().clone()
        const first = Vector3.Distance(shoulder, lower.getAbsolutePosition())
        const second = Vector3.Distance(lower.getAbsolutePosition(), hand.getAbsolutePosition())
        const delta = target.subtract(shoulder)
        const distance = Math.min(delta.length(), (first + second) * POSE.reach)
        const direction = delta.normalize()
        const reach = shoulder.add(direction.scale(distance))
        const pole = Vector3.TransformNormal(
          new Vector3(sign * POSE.poleX, POSE.poleY, POSE.poleZ),
          hipWorld,
        )
        const bend = pole.subtract(direction.scale(Vector3.Dot(pole, direction))).normalize()
        const along = (first * first - second * second + distance * distance) / (2 * distance)
        const height = Math.sqrt(Math.max(0, first * first - along * along))
        aim(upper, lower, shoulder.add(direction.scale(along)).add(bend.scale(height)))
        aim(lower, hand, reach)
        hand.rotationQuaternion = Quaternion.FromEulerAngles(
          sign * (POSE.wrist + gesturing * (POSE.gestureWrist - POSE.wrist)),
          0,
          0,
        )
      }
    },
  }
}
