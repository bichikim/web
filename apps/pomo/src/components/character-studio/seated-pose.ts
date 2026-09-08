import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Ray} from '@babylonjs/core/Culling/ray'
import {Quaternion, Vector3} from '@babylonjs/core/Maths/math.vector'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import {sampleSeatedAction} from './seated-actions'
import {createSeatedArms} from './seated-arms'

const SEAT = {
  armDrop: 1.25,
  center: 0.5,
  cushion: 0.602,
  elbow: 1.1,
  haruInset: 0.025,
  height: 0.76,
  legSpread: 0.035,
  scale: 1.15,
  skirtDrape: 0.45,
  skirtLap: 0.3,
  spacing: 0.98,
  x: -0.9,
  yaw: Math.PI / 2,
}

const alignCushion = (container: AssetContainer, root: TransformNode, inset: number) => {
  const contact = {components: 3, influences: 4, minimumWeight: 0.5}
  let bottom = Infinity
  root.computeWorldMatrix(true)
  container.meshes.forEach((mesh) => {
    const {skeleton} = mesh
    const indices = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)
    const weights = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)
    if (skeleton === null || indices === null || weights === null) {
      return
    }
    skeleton.prepare(true)
    const positions = mesh.getPositionData(true, true)
    const pelvis = skeleton.bones.find((bone) => bone.name === 'J_Bip_C_Hips')?.getIndex()
    if (positions === null || pelvis === undefined || pelvis < 0) {
      return
    }
    const world = mesh.computeWorldMatrix(true)
    for (let vertex = 0; vertex < positions.length / contact.components; vertex += 1) {
      let influence = 0
      for (let slot = 0; slot < contact.influences; slot += 1) {
        const offset = vertex * contact.influences + slot
        influence += indices[offset] === pelvis ? weights[offset] : 0
      }
      if (influence >= contact.minimumWeight) {
        const point = Vector3.TransformCoordinates(
          Vector3.FromArray(positions, vertex * contact.components),
          world,
        )
        bottom = Math.min(bottom, point.y)
      }
    }
  })
  const hit = container.scene.pickWithRay(
    new Ray(new Vector3(root.position.x, SEAT.height, root.position.z), Vector3.Down()),
    (mesh) => mesh.material?.name.includes('seatCushion') === true,
  )
  if (Number.isFinite(bottom)) {
    root.position.y +=
      (hit?.pickedPoint === null || hit?.pickedPoint === undefined
        ? SEAT.cushion
        : hit.pickedPoint.y - inset) - bottom
    root.computeWorldMatrix(true)
  }
  return hit?.hit === true
}
const MOTION = {
  blinkDuration: 0.19,
  blinkInterval: 4.1,
  blinkOffset: 0.73,
  breathing: 0.012,
  breathSpeed: 1.6,
  glance: 0.18,
  head: 0.045,
  lean: 0.045,
  maxDelta: 0.1,
  nod: 0.018,
  nodSpeed: 0.7,
  offset: 1.37,
  seconds: 1_000,
  shift: 0.025,
  tilt: 0.015,
  tiltSpeed: 0.31,
  turnSpeed: 0.43,
}

export const seatCharacter = (
  container: AssetContainer,
  index: number,
  readBlink: () => number = () => 0,
) => {
  const {scene} = container
  const root = new TransformNode(`seated-character-${index}`, scene)
  root.position.set(SEAT.x, 0, (index - SEAT.center) * SEAT.spacing)
  root.rotation.y = SEAT.yaw
  root.scaling.setAll(SEAT.scale)
  for (const node of container.rootNodes) {
    node.parent = root
  }
  const find = (name: string) => container.transformNodes.find((node) => node.name === name)
  const hips = find('J_Bip_C_Hips')
  root.position.y = SEAT.height - (hips?.position.y ?? SEAT.height) * SEAT.scale
  const rotations = new Map<TransformNode, Quaternion | null>()
  const rotate = (name: string, x: number, y: number, z: number) => {
    const node = find(name)
    if (node !== undefined) {
      if (!rotations.has(node)) {
        rotations.set(node, node.rotationQuaternion?.clone() ?? null)
      }
      node.rotationQuaternion = Quaternion.FromEulerAngles(x, y, z)
    }
  }
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1
    rotate(`J_Bip_${side}_UpperLeg`, -Math.PI / 2, 0, sign * SEAT.legSpread)
    rotate(`J_Bip_${side}_LowerLeg`, Math.PI / 2, 0, 0)
    rotate(`J_Bip_${side}_UpperArm`, 0, 0, -sign * SEAT.armDrop)
    rotate(`J_Bip_${side}_LowerArm`, 0, -sign * SEAT.elbow, 0)
  }
  for (const node of container.transformNodes) {
    if (/SkirtFront1_\d+$/u.test(node.name)) {
      rotate(node.name, SEAT.skirtLap, 0, 0)
    }
    if (/SkirtFront2_\d+$/u.test(node.name)) {
      rotate(node.name, SEAT.skirtDrape, 0, 0)
    }
  }
  const inset = index === 0 ? SEAT.haruInset : 0
  let cushionAligned = alignCushion(container, root, inset)
  let elapsed = index * MOTION.offset
  const arms = createSeatedArms(container)
  const blinks = container.meshes.flatMap((mesh) => {
    const manager = mesh.morphTargetManager
    return Array.from({length: manager?.numTargets ?? 0}, (_, target) =>
      manager!.getTarget(target),
    ).filter((target) => target.name === 'Fcl_EYE_Close')
  })
  const observer = scene.onBeforeRenderObservable.add(() => {
    if (
      !cushionAligned &&
      scene.meshes.some((mesh) => mesh.material?.name.includes('seatCushion'))
    ) {
      cushionAligned = alignCushion(container, root, inset)
    }
    elapsed += Math.min(scene.getEngine().getDeltaTime() / MOTION.seconds, MOTION.maxDelta)
    const action = sampleSeatedAction(elapsed + index * MOTION.blinkInterval)
    rotate(
      'J_Bip_C_Spine',
      Math.sin(elapsed * MOTION.breathSpeed) * MOTION.breathing + action.hands * MOTION.lean,
      0,
      action.shift * MOTION.shift * (index === 0 ? 1 : -1),
    )
    rotate(
      'J_Bip_C_Head',
      Math.sin(elapsed * MOTION.nodSpeed) * MOTION.nod,
      Math.sin(elapsed * MOTION.turnSpeed) * MOTION.head +
        action.glance * MOTION.glance * (index === 0 ? 1 : -1),
      Math.sin(elapsed * MOTION.tiltSpeed) * MOTION.tilt,
    )
    arms.update(action, elapsed + index * MOTION.blinkInterval)
    const phase = elapsed % (MOTION.blinkInterval + index * MOTION.blinkOffset)
    const blink =
      phase < MOTION.blinkDuration ? Math.sin((phase / MOTION.blinkDuration) * Math.PI) : 0
    for (const target of blinks) {
      target.influence = Math.max(blink, readBlink())
    }
  })
  return () => {
    scene.onBeforeRenderObservable.remove(observer)
    arms.dispose()
    rotations.forEach((rotation, node) => {
      node.rotationQuaternion = rotation
    })
    for (const target of blinks) {
      target.influence = 0
    }
    for (const node of container.rootNodes) {
      node.parent = null
    }
    root.dispose()
  }
}
