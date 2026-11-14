import {createVertexMapper} from './create-vertex-mapper'
import {createGridInputs} from './create-grid-inputs'
import {getRotationFrame} from './get-rotation-frame'
import {sameDeformerShape} from '../../../../deformation/binding'
import {composeParameterDeformer} from '../../../../deformation/scene'
import type {PuppetDocument, PuppetSceneDeformerNode, PuppetSceneNode} from '../../../document'
import {getDocumentScene} from '../../../scene'
import type {NativeTransform, NativeTransformFactory} from '../../create-native-deformation'

const ROTATION_FIELDS = 14
const NODE_FIELDS = 15
const MAXIMUM_AXES = 8
const MAXIMUM_VERSION = 0xffff_ffff
const mode = (interpolation: PuppetSceneDeformerNode['interpolation']) => {
  switch (interpolation) {
    case 'bilinear':
      return 0
    case 'triangles-mirrored':
      return 2
    case 'triangles':
    case undefined:
      return 1
    default: {
      const exhaustive: never = interpolation
      throw new Error(`Unknown warp interpolation: ${exhaustive}`)
    }
  }
}
const supports = (node: PuppetSceneNode): boolean => {
  if (node.kind === 'part') {
    return true
  }
  if (node.kind === 'group') {
    return node.children.every(supports)
  }
  const rigid = node.deformerType === 'rotation'
  const SEGMENT_COORDINATES = 4
  const rest = node.boneRestPoints
  return (
    (rigid
      ? rest?.length === SEGMENT_COORDINATES &&
        rest.every(Number.isFinite) &&
        (rest[0] !== rest[2] || rest[1] !== rest[3])
      : node.rotationAngle === undefined &&
        node.rows > 0 &&
        node.columns > 0 &&
        node.bounds.width !== 0 &&
        node.bounds.height !== 0) && node.children.every(supports)
  )
}

/** Creates document-owned Float64 transforms; unsupported layouts retain the JS evaluator. */
export const createWasmTransform = (
  document: PuppetDocument,
  instance: WebAssembly.Instance,
): NativeTransformFactory | undefined => {
  if (
    !getDocumentScene(document).roots.every(supports) ||
    document.parameterBindings?.some(
      (binding) =>
        (binding.targetDeformerIds?.length ?? 0) > 0 &&
        (binding.interpolation !== 'grid' || binding.parameterIds.length > MAXIMUM_AXES),
    )
  ) {
    return undefined
  }
  const {allocate, map_vertices: mapVertices, memory, sample} = instance.exports
  if (
    typeof allocate !== 'function' ||
    typeof mapVertices !== 'function' ||
    typeof sample !== 'function' ||
    !(memory instanceof WebAssembly.Memory)
  ) {
    throw new TypeError('Invalid deformation kernel exports')
  }
  const storage = (pointer: number, length: number) =>
    new Float64Array(memory.buffer, pointer, length)
  const reserve = (length: number) => Number(allocate(length))
  const copy = (values: ArrayLike<number>) => {
    const pointer = reserve(values.length)
    storage(pointer, values.length).set(values)
    return pointer
  }
  const scratch = reserve(2)
  const handles = new WeakMap<NativeTransform, number>()
  return (node, parent) => {
    const rigid = node.deformerType === 'rotation'
    const parentHandle = parent === undefined ? 0 : handles.get(parent)!
    const pointer = reserve(NODE_FIELDS)
    const restPointer = copy(node.controlPoints)
    const worldPointer = reserve(node.controlPoints.length)
    const versionsPointer = reserve(node.controlPoints.length / 2)
    const rotationPointer = rigid ? reserve(ROTATION_FIELDS) : 0
    const inputs = rigid
      ? undefined
      : createGridInputs(document, node, {copy, reserve, storage}, restPointer)
    storage(pointer, NODE_FIELDS).set([
      Number(rigid),
      parentHandle,
      node.rows,
      node.columns,
      node.bounds.x,
      node.bounds.y,
      node.bounds.width,
      node.bounds.height,
      mode(node.interpolation),
      rigid ? rotationPointer : restPointer,
      inputs?.bindings ?? 0,
      inputs?.count ?? 0,
      worldPointer,
      versionsPointer,
      1,
    ])
    let shape: PuppetSceneDeformerNode | undefined
    let parentVersion = -1
    let version = 1
    const output = {x: 0, y: 0}
    const transform: NativeTransform = {
      createMapper: () =>
        createVertexMapper({
          mapVertices: (buffer, length, changed) =>
            mapVertices(pointer, buffer, length, Number(changed)),
          memory,
          reserve,
          version: () => version,
        }),
      rotation: rigid,
      sample(point) {
        sample(pointer, point.x, point.y, scratch)
        const coordinates = storage(scratch, 2)
        output.x = coordinates[0]!
        output.y = coordinates[1]!
        return output
      },
      update(values) {
        const nextVersion = parent?.version ?? 0
        let changed: boolean
        if (rigid) {
          const next = composeParameterDeformer(document, node, values)
          changed =
            shape === undefined ||
            shape.controlPoints !== next.controlPoints ||
            !sameDeformerShape(shape, next)
          if (changed) {
            shape = {...next, children: []}
          }
        } else {
          changed = inputs!.update(values)
        }
        if (changed || parentVersion !== nextVersion) {
          parentVersion = nextVersion
          version += 1
          if (version > MAXIMUM_VERSION) {
            storage(versionsPointer, node.controlPoints.length / 2).fill(0)
            version = 1
          }
          storage(pointer, NODE_FIELDS)[14] = version
          if (rigid) {
            storage(rotationPointer, ROTATION_FIELDS).set(getRotationFrame(shape!, parent))
          }
        }
      },
      get version() {
        return version
      },
    }
    handles.set(transform, pointer)
    return transform
  }
}
