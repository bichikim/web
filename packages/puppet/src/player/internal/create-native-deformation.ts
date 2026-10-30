import {sameDeformerShape} from '../../deformation/binding'
import {getBoneSegmentTransforms, getBoneWeights} from '../../deformation/bone'
import {transformDeformerPoint} from '../../deformation/grid'
import {
  createDeformerSampler,
  type DeformerSampler,
} from '../../deformation/create-deformer-sampler'
import type {PuppetParameterValueMap} from '../../deformation/composition'
import {composeParameterDeformer} from '../../deformation/scene'
import {getDocumentScene} from '../scene'
import {createWarpGridSampler} from '../../deformation/sample-warp-grid'
import type {
  PuppetDocument,
  PuppetPoint,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../document'

// Internal results are borrowed until that transform is sampled again.
type PointTransform = (point: PuppetPoint) => PuppetPoint

interface NativeTransform {
  readonly rotation: boolean
  readonly version: number
  sample(point: PuppetPoint): PuppetPoint
  update(values: PuppetParameterValueMap | undefined): void
}

interface TransformBuffer {
  sample(point: PuppetPoint): PuppetPoint
  refresh(node: PuppetSceneDeformerNode): void
}

interface CompiledPart {
  readonly partId: string
  readonly transform: NativeTransform | undefined
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

const supportsNode = (node: PuppetSceneNode): boolean => {
  if (node.kind === 'part') {
    return node.skinning === undefined
  }
  const supported =
    node.kind === 'group' ||
    (node.coordinateSpace === 'parent' &&
      node.binding === undefined &&
      node.pins === undefined &&
      node.curveAxis === undefined &&
      node.curveHandles === undefined &&
      node.boneWeights === undefined &&
      node.vertexInfluences === undefined &&
      (node.deformerType === 'rotation' ||
        (node.deformerType === undefined &&
          node.boneRestPoints === undefined &&
          node.interpolation !== undefined)))
  return supported && node.children.every(supportsNode)
}

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
          const transformed = mapParent(input)
          values[point * 2] = transformed.x
          values[point * 2 + 1] = transformed.y
          initialized[point] = version
        }
      },
    },
  })
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
    sample: (point) => {
      sampler.sampleInto(point, output, 1)
      return output
    },
  }
}

const createNativeTransform = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
): NativeTransform => {
  const rotation = node.deformerType === 'rotation'
  const local = rotation ? undefined : createDeformerSampler(document, node)
  const buffer = rotation ? createRotationBuffer(parent) : createGridBuffer(node, parent, local!)
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

const compileNodes = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
): CompiledScene => {
  const transforms: NativeTransform[] = []
  const parts: CompiledPart[] = []
  const visit = (children: ReadonlyArray<PuppetSceneNode>, parent?: NativeTransform) => {
    for (const node of children) {
      if (node.kind === 'part') {
        parts.push({partId: node.id, transform: parent})
      } else {
        const transform =
          node.kind === 'deformer' ? createNativeTransform(document, node, parent) : parent
        if (node.kind === 'deformer') {
          transforms.push(transform!)
        }
        visit(node.children, transform)
      }
    }
  }
  visit(nodes)
  return {parts, transforms}
}

const applyParts = (
  parts: ReadonlyArray<CompiledPart>,
  verticesById: ReadonlyMap<string, Float32Array | number[]>,
) => {
  const input = {x: 0, y: 0}
  for (const part of parts) {
    const vertices = verticesById.get(part.partId)
    if (vertices !== undefined) {
      const transform = part.transform?.sample ?? identity
      for (let offset = 0; offset < vertices.length; offset += 2) {
        input.x = vertices[offset] ?? 0
        input.y = vertices[offset + 1] ?? 0
        const point = transform(input)
        vertices[offset] = point.x
        vertices[offset + 1] = point.y
      }
    }
  }
}

/** Owns reusable native parent-space buffers; unsupported rigs keep the general evaluator. */
export const createNativeDeformation = (
  document: PuppetDocument,
): NativeDeformation | undefined => {
  const nodes = getDocumentScene(document).roots
  if (document.parts.some((part) => part.spatial !== undefined) || !nodes.every(supportsNode)) {
    return undefined
  }
  const compiled = compileNodes(document, nodes)
  return {
    apply: (values, vertices) => {
      for (const transform of compiled.transforms) {
        transform.update(values)
      }
      applyParts(compiled.parts, vertices)
    },
  }
}
