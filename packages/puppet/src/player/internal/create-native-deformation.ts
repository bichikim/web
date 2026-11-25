import {sameDeformerShape} from '../../deformation/binding'
import {getBoneSegmentTransforms, getBoneWeights} from '../../deformation/bone'
import {transformDeformerPoint} from '../../deformation/grid'
import {
  createDeformerSampler,
  type DeformerSampler,
} from '../../deformation/create-deformer-sampler'
import type {PuppetParameterValueMap} from '../../deformation/composition'
import {composeParameterDeformer} from '../../deformation/scene'
import {composeRenderScene} from '../../deformation/compose-render-scene'
import {applySceneNodeDeformers} from '../../deformation/vertices'
import {getDocumentScene} from '../scene'
import {createWarpGridSampler} from '../../deformation/sample-warp-grid'
import {createDeferredParentSpaceTransform} from '../../deformation/parent-space'
import {getNativeTransformKey} from './get-native-transform-key'
import {getVertexInfluence} from '../../deformation/weights'
import type {
  PuppetDocument,
  PuppetPoint,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
  PuppetVertexReference,
} from '../document'

// Internal results are borrowed until that transform is sampled again.
type PointTransform = (point: PuppetPoint) => PuppetPoint

export interface NativeTransform {
  /** Creates an independent mapper retaining inputs and outputs before Glue. Omitted, use scalar sampling. */
  readonly createMapper?: () => (vertices: Float32Array | number[]) => void
  readonly rotation: boolean
  readonly version: number
  sample(point: PuppetPoint, vertex?: PuppetVertexReference): PuppetPoint
  update(values: PuppetParameterValueMap | undefined): void
}

interface TransformBuffer {
  sample(point: PuppetPoint, vertex?: PuppetVertexReference): PuppetPoint
  refresh(node: PuppetSceneDeformerNode): void
}

interface CompiledPart {
  readonly ancestors: ReadonlyArray<NativeTransform>
  readonly partId: string
  apply(vertices: Float32Array | number[]): void
}

interface CompiledScene {
  readonly transforms: ReadonlyArray<NativeTransform>
  readonly parts: ReadonlyArray<CompiledPart>
}

export interface NativeDeformation {
  /** Updates caller-owned vertices from this document's current parameter inputs. */
  apply(
    values: PuppetParameterValueMap | undefined,
    vertices: ReadonlyMap<string, Float32Array | number[]>,
  ): void
}

const identity: PointTransform = (point) => point

const usesSimpleGrid = (node: PuppetSceneDeformerNode): boolean =>
  node.deformerType === undefined &&
  node.interpolation !== undefined &&
  node.curveAxis === undefined &&
  node.curveHandles === undefined &&
  node.boneRestPoints === undefined &&
  node.rotationAngle === undefined

const supportsNativeNode = (node: PuppetSceneNode): boolean => {
  if (node.kind === 'part') {
    return node.skinning === undefined
  }
  return (
    node.kind === 'group' ||
    (node.binding === undefined &&
      node.pins === undefined &&
      node.boneWeights === undefined &&
      (node.vertexInfluences === undefined ||
        (node.coordinateSpace !== 'parent' &&
          usesSimpleGrid(node) &&
          node.children.every((child) => child.kind === 'part'))) &&
      (node.boneRestPoints === undefined || node.deformerType === 'rotation'))
  )
}

const supportsNode = (node: PuppetSceneNode): boolean =>
  supportsNativeNode(node) && (node.kind === 'part' || node.children.every(supportsNode))

const selectNativeNodes = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<PuppetSceneNode> =>
  nodes.flatMap((node): ReadonlyArray<PuppetSceneNode> => {
    if (node.kind === 'part') {
      return supportsNode(node) ? [node] : []
    }
    if (!supportsNativeNode(node)) {
      return []
    }
    const children = selectNativeNodes(node.children)
    return children.length === 0 ? [] : [{...node, children}]
  })

const createRotationBuffer = (parent: NativeTransform | undefined): TransformBuffer => {
  const mapParent = parent?.sample ?? identity
  const output = {x: 0, y: 0}
  let sample: PointTransform = identity
  return {
    refresh(node) {
      const origin = transformDeformerPoint(node, {x: 0, y: 0})
      const world = mapParent(origin)
      const worldX = world.x
      const worldY = world.y
      const ROTATION_REFERENCE_DISTANCE = 0.1
      const distance = node.rotationReferenceDistance ?? ROTATION_REFERENCE_DISTANCE
      const reference = mapParent({x: origin.x, y: origin.y - distance})
      const angle =
        Math.atan2(
          (worldY - reference.y) * Math.sign(distance),
          (worldX - reference.x) * Math.sign(distance),
        ) -
        Math.PI / 2
      const scale =
        parent?.rotation === true
          ? Math.hypot(worldX - reference.x, worldY - reference.y) / Math.abs(distance)
          : 1
      const cosine = Math.cos(angle) * scale
      const sine = Math.sin(angle) * scale
      const RIGID_COORDINATES = 4
      const segment =
        node.boneRestPoints?.length === RIGID_COORDINATES
          ? getBoneSegmentTransforms(node)[0]
          : undefined
      const reflectX = node.rotationReflection?.[0] === true ? -1 : 1
      const reflectY = node.rotationReflection?.[1] === true ? -1 : 1
      sample = (point) => {
        let localX: number
        let localY: number
        if (segment === undefined) {
          const local = transformDeformerPoint(node, point)
          localX = local.x
          localY = local.y
        } else {
          const horizontal = (point.x - segment.start.x) * reflectX
          const vertical = (point.y - segment.start.y) * reflectY
          const transformedX =
            segment.origin.x + horizontal * segment.cosine - vertical * segment.sine
          const transformedY =
            segment.origin.y + horizontal * segment.sine + vertical * segment.cosine
          const weight = getBoneWeights(node, point)[0]!
          const boneX = point.x + (transformedX - point.x) * weight
          const boneY = point.y + (transformedY - point.y) * weight
          // Keep both weight-one stages: collapsing them changes Float64 cancellation.
          localX = point.x + (boneX - point.x) * 1
          localY = point.y + (boneY - point.y) * 1
        }
        const x = localX - origin.x
        const y = localY - origin.y
        output.x = worldX + x * cosine - y * sine
        output.y = worldY + x * sine + y * cosine
        return output
      }
    },
    sample: (point) => sample(point),
  }
}

const createGridBuffer = (
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
  local: DeformerSampler,
): TransformBuffer => {
  const mapParent = parent?.sample ?? identity
  const parentSpace = node.coordinateSpace === 'parent'
  const mapControl = parentSpace ? mapParent : identity
  const values = new Float64Array(node.controlPoints.length)
  const input = {x: 0, y: 0}
  const output = {x: 0, y: 0}
  const initialized = new Uint32Array(node.controlPoints.length / 2)
  let version = 0
  const sampler = createWarpGridSampler({
    node,
    points: {
      coordinates: values,
      resolve: (point) => {
        if (initialized[point] !== version) {
          local.samplePoint(point, input)
          const transformed = mapControl(input)
          values[point * 2] = transformed.x
          values[point * 2 + 1] = transformed.y
          initialized[point] = version
        }
      },
    },
  })
  const sample: TransformBuffer['sample'] = parentSpace
    ? (point) => {
        sampler.sampleInto(point, output, 1)
        return output
      }
    : (point, vertex) => {
        sampler.sampleInto(point, output, getVertexInfluence(node, vertex))
        return mapParent(output)
      }
  return {
    refresh() {
      version += 1
      const MAXIMUM_VERSION = 0xffff_ffff
      if (version > MAXIMUM_VERSION) {
        initialized.fill(0)
        version = 1
      }
      sampler.reset()
    },
    sample,
  }
}

const createNativeTransform = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
): NativeTransform => {
  const rotation = node.deformerType === 'rotation'
  const local = usesSimpleGrid(node) ? createDeformerSampler(document, node) : undefined
  const buffer = createTransformBuffer(node, parent, local)
  let shape: PuppetSceneDeformerNode | undefined
  let parentVersion = -1
  let version = 0
  return {
    rotation,
    sample: buffer.sample,
    update(values) {
      const nextVersion = parent?.version ?? 0
      let changed: boolean
      if (local === undefined) {
        const next = composeParameterDeformer(document, node, values)
        changed =
          shape === undefined ||
          shape.controlPoints !== next.controlPoints ||
          !sameDeformerShape(shape, next)
        if (changed) {
          // Retaining a static ancestor must not retain an old animated child tree.
          shape = {...next, children: []}
        }
      } else {
        changed = local.update(values)
        shape = node
      }
      if (changed || parentVersion !== nextVersion) {
        parentVersion = nextVersion
        version += 1
        buffer.refresh(shape!)
      }
    },
    get version() {
      return version
    },
  }
}

const createGeneralBuffer = (parent: NativeTransform | undefined): TransformBuffer => {
  const mapParent = (point: PuppetPoint): PuppetPoint => {
    const transformed = parent?.sample(point) ?? point
    // Canonical transforms can retain several results, including independent curve handles.
    return {x: transformed.x, y: transformed.y}
  }
  let sample: PointTransform = identity
  return {
    refresh(node) {
      const shape = {...node, children: []}
      sample =
        shape.coordinateSpace === 'parent'
          ? createDeferredParentSpaceTransform(shape, mapParent)
          : (point) => mapParent(transformDeformerPoint(shape, point))
    },
    sample: (point) => sample(point),
  }
}

const createTransformBuffer = (
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
  local: DeformerSampler | undefined,
): TransformBuffer => {
  if (local !== undefined) {
    return createGridBuffer(node, parent, local)
  }
  if (node.deformerType === 'rotation' && node.coordinateSpace === 'parent') {
    return createRotationBuffer(parent)
  }
  return createGeneralBuffer(parent)
}

const compileNodes = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
  factory?: NativeTransformFactory,
): CompiledScene => {
  const transforms: NativeTransform[] = []
  const parts: CompiledPart[] = []
  const shared = new Map<NativeTransform | undefined, Map<string, NativeTransform>>()
  const transformOf = (node: PuppetSceneDeformerNode, parent: NativeTransform | undefined) => {
    let group = shared.get(parent)
    if (group === undefined) {
      group = new Map()
      shared.set(parent, group)
    }
    const key = getNativeTransformKey(document, node)
    let transform = group.get(key)
    if (transform === undefined) {
      transform = factory?.(node, parent) ?? createNativeTransform(document, node, parent)
      group.set(key, transform)
      transforms.push(transform)
    }
    return transform
  }
  const visit = (
    children: ReadonlyArray<PuppetSceneNode>,
    parent?: NativeTransform,
    ancestors: ReadonlyArray<NativeTransform> = [],
  ) => {
    for (const node of children) {
      if (node.kind === 'part') {
        parts.push({ancestors, apply: createVertexTransform(parent, node.id), partId: node.id})
      } else {
        const transform = node.kind === 'deformer' ? transformOf(node, parent) : parent
        visit(
          node.children,
          transform,
          node.kind === 'deformer' ? [...ancestors, transform!] : ancestors,
        )
      }
    }
  }
  visit(nodes)
  return {parts, transforms}
}

/** Retains unrounded outputs before downstream Glue mutates the caller's buffers. */
const createVertexTransform = (transform: NativeTransform | undefined, partId: string) => {
  if (transform?.createMapper !== undefined) {
    return transform.createMapper()
  }
  const sample = transform?.sample ?? identity
  const input = {x: 0, y: 0}
  const vertex = {partId, vertexIndex: 0}
  let previousVersion = -1
  let coordinates = new Float64Array(0)
  let output = new Float64Array(0)
  let length = -1
  return (vertices: Float32Array | number[]): void => {
    const {length: nextLength} = vertices
    const version = transform?.version ?? 0
    const changed = previousVersion !== version || length !== nextLength
    if (length !== nextLength) {
      length = nextLength
      coordinates = new Float64Array(length + (length % 2))
      output = new Float64Array(coordinates.length)
    }
    for (let offset = 0; offset < vertices.length; offset += 2) {
      input.x = vertices[offset] ?? 0
      input.y = vertices[offset + 1] ?? 0
      if (
        changed ||
        !Object.is(coordinates[offset], input.x) ||
        !Object.is(coordinates[offset + 1], input.y)
      ) {
        coordinates[offset] = input.x
        coordinates[offset + 1] = input.y
        vertex.vertexIndex = offset / 2
        const point = sample(input, vertex)
        output[offset] = point.x
        output[offset + 1] = point.y
      }
      vertices[offset] = output[offset]!
      vertices[offset + 1] = output[offset + 1]!
    }
    previousVersion = version
  }
}

const applyParts = (
  parts: ReadonlyArray<CompiledPart>,
  verticesById: ReadonlyMap<string, Float32Array | number[]>,
) => {
  for (const part of parts) {
    const vertices = verticesById.get(part.partId)
    if (vertices !== undefined) {
      part.apply(vertices)
    }
  }
}

/** Creates one owner-scoped numeric transform with the supplied parent mapping. */
export type NativeTransformFactory = (
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
) => NativeTransform

/** Reuses supported ancestor paths while preserving general evaluation for the other parts. */
export const createNativeDeformation = (
  document: PuppetDocument,
  factory?: NativeTransformFactory,
): NativeDeformation | undefined => {
  const nodes = getDocumentScene(document).roots
  const complete = nodes.every(supportsNode)
  const selectedNodes = complete ? nodes : selectNativeNodes(nodes)
  if (!complete && selectedNodes.length === 0) {
    return undefined
  }
  const compiled = compileNodes(document, selectedNodes, factory)
  const partIds = new Set(compiled.parts.map((part) => part.partId))
  return {
    apply: (values, vertices) => {
      const selected =
        vertices.size >= compiled.parts.length
          ? undefined
          : new Set(
              compiled.parts
                .filter((part) => vertices.has(part.partId))
                .flatMap((part) => part.ancestors),
            )
      for (const transform of compiled.transforms) {
        if (selected === undefined || selected.has(transform)) {
          transform.update(values)
        }
      }
      applyParts(compiled.parts, vertices)
      if (!complete) {
        const general = new Map([...vertices].filter(([id]) => !partIds.has(id)))
        if (general.size > 0) {
          // Keep the whole scene for skinning references outside the selected part's branch.
          applySceneNodeDeformers(composeRenderScene(document, values).roots, general, {
            deferCoordinates: true,
          })
        }
      }
    },
  }
}
