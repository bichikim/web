import {hasAffineUv} from './internal/affine-uv'
import {getBoneWeights} from '../deformation/bone'
import {getBoundaryEdges, validateMesh} from '../mesh'
import type {
  PuppetDeformerShape,
  PuppetDocument,
  PuppetParameterBinding,
  PuppetPart,
  PuppetSceneNode,
} from '../player/document'
import type {MovePartVertexOptions} from './edit-document'

export interface MoveMeshVertexSuccess {
  readonly ok: true
  readonly document: PuppetDocument
}
export interface MoveMeshVertexFailure {
  readonly ok: false
  readonly message: string
}
export type MoveMeshVertexResult = MoveMeshVertexFailure | MoveMeshVertexSuccess

const TRIANGLE_SIZE = 3
const SAMPLE_EPSILON = -1e-8
const AREA_EPSILON = 1e-10

interface Sample {
  readonly indices: readonly number[]
  readonly weights: readonly number[]
}

const findSample = (
  options: MovePartVertexOptions,
  vertices: readonly number[],
  indices: readonly number[],
): Sample | undefined => {
  for (let offset = 0; offset < indices.length; offset += TRIANGLE_SIZE) {
    const triangle = indices.slice(offset, offset + TRIANGLE_SIZE)
    const [first, second, third] = triangle.map((index) => ({
      x: vertices[index * 2]!,
      y: vertices[index * 2 + 1]!,
    }))
    if (first !== undefined && second !== undefined && third !== undefined) {
      const divisor =
        (second.y - third.y) * (first.x - third.x) + (third.x - second.x) * (first.y - third.y)
      const firstWeight =
        ((second.y - third.y) * (options.x - third.x) +
          (third.x - second.x) * (options.y - third.y)) /
        divisor
      const secondWeight =
        ((third.y - first.y) * (options.x - third.x) +
          (first.x - third.x) * (options.y - third.y)) /
        divisor
      const weights = [firstWeight, secondWeight, 1 - firstWeight - secondWeight]
      if (weights.every((weight) => Number.isFinite(weight) && weight >= SAMPLE_EPSILON)) {
        const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
        return {indices: triangle, weights: weights.map((weight) => Math.max(0, weight) / total)}
      }
    }
  }
  return undefined
}

interface RemapShapeOptions {
  readonly shape: PuppetDeformerShape
  readonly part: PuppetPart
  readonly vertexIndex: number
  readonly sample: Sample
  readonly sampleValues: (values: readonly number[]) => number
}
const remapShape = (options: RemapShapeOptions): PuppetDeformerShape => {
  const {shape, part, sample, sampleValues} = options

  const {vertexInfluences} = shape
  const {boneWeights} = shape
  const result = {...shape}
  if (vertexInfluences !== undefined) {
    const weights = part.mesh.vertices
      .filter((_, index) => index % 2 === 0)
      .map(
        (_, index) =>
          vertexInfluences.find((entry) => entry.partId === part.id && entry.vertexIndex === index)
            ?.weight ?? 1,
      )
    result.vertexInfluences = [
      ...vertexInfluences.filter(
        (entry) => entry.partId !== part.id || entry.vertexIndex !== options.vertexIndex,
      ),
      {partId: part.id, vertexIndex: options.vertexIndex, weight: sampleValues(weights)},
    ]
  }
  if (shape.boneRestPoints !== undefined) {
    const sampled = sample.indices.map((index) =>
      getBoneWeights(
        shape,
        {x: part.mesh.vertices[index * 2]!, y: part.mesh.vertices[index * 2 + 1]!},
        {partId: part.id, vertexIndex: index},
      ),
    )
    const count = shape.boneRestPoints.length / 2 - 1
    const weights = Array.from({length: count}, (_, bone) =>
      sampled.reduce((sum, values, index) => sum + (values[bone] ?? 0) * sample.weights[index]!, 0),
    )
    result.boneWeights = [
      ...(boneWeights ?? []).filter(
        (entry) => entry.partId !== part.id || entry.vertexIndex !== options.vertexIndex,
      ),
      {partId: part.id, vertexIndex: options.vertexIndex, weights},
    ]
  }
  return result
}

const hasSameWinding = (
  indices: readonly number[],
  before: readonly number[],
  after: readonly number[],
) =>
  indices.every((_, offset, indices) => {
    if (offset % TRIANGLE_SIZE !== 0) {
      return true
    }
    const first = indices[offset]! * 2
    const second = indices[offset + 1]! * 2
    const third = indices[offset + 2]! * 2
    const area = (values: readonly number[]) =>
      (values[second]! - values[first]!) * (values[third + 1]! - values[first + 1]!) -
      (values[second + 1]! - values[first + 1]!) * (values[third]! - values[first]!)
    return area(before) * area(after) > AREA_EPSILON
  })

const preservesBoundary = (part: PuppetPart, options: MovePartVertexOptions): boolean =>
  getBoundaryEdges(part.mesh)
    .filter(
      (edge) => edge.firstIndex === options.vertexIndex || edge.secondIndex === options.vertexIndex,
    )
    .every((edge) => {
      const [x, y] = part.mesh.vertices.slice(edge.firstIndex * 2, edge.firstIndex * 2 + 2)
      const dx = part.mesh.vertices[edge.secondIndex * 2]! - x!
      const dy = part.mesh.vertices[edge.secondIndex * 2 + 1]! - y!
      return Math.abs(dx * (options.y - y!) - dy * (options.x - x!)) <= AREA_EPSILON
    })

interface MeshEditingOptions {
  readonly document: PuppetDocument
  readonly partId?: string
}

export const getMeshEditingIssue = (options: MeshEditingOptions): string | null => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (part === undefined) {
    return '편집할 파츠를 선택하세요.'
  }
  if (
    options.document.motions.some((motion) =>
      motion.tracks.some((track) => track.kind === 'vertex' && track.partId === part.id),
    )
  ) {
    return '정점 애니메이션 트랙이 있는 파츠는 메시 편집을 지원하지 않습니다.'
  }
  if (!hasAffineUv(part.mesh)) {
    return '이미 비선형으로 변형된 UV는 그림 고정 메시 편집을 지원하지 않습니다.'
  }
  return null
}

/** Relocates an existing rest vertex while resampling its texture and deformation data. */
export const moveMeshVertex = (options: MovePartVertexOptions): MoveMeshVertexResult => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (
    part === undefined ||
    !Number.isInteger(options.vertexIndex) ||
    options.vertexIndex < 0 ||
    options.vertexIndex * 2 >= part.mesh.vertices.length ||
    !Number.isFinite(options.x) ||
    !Number.isFinite(options.y)
  ) {
    return {message: '유효한 정점과 위치를 선택하세요.', ok: false}
  }
  const issue = getMeshEditingIssue(options)
  if (issue !== null) {
    return {message: issue, ok: false}
  }
  if (!preservesBoundary(part, options)) {
    return {
      message: '그림 경계가 잘리지 않도록 외곽 정점은 기존 경계선을 따라 이동하세요.',
      ok: false,
    }
  }
  const sample = findSample(options, part.mesh.vertices, part.mesh.indices)
  if (sample === undefined) {
    return {message: '기존 메시 영역 안으로 정점을 이동하세요.', ok: false}
  }
  const sampleValues = (values: readonly number[], stride = 1, axis = 0) =>
    sample.indices.reduce(
      (sum, index, offset) => sum + (values[index * stride + axis] ?? 0) * sample.weights[offset]!,
      0,
    )
  const resample = (values: readonly number[], stride = 1) =>
    values.map((value, index) =>
      Math.floor(index / stride) === options.vertexIndex
        ? sampleValues(values, stride, index % stride)
        : value,
    )
  const vertices = [...part.mesh.vertices]
  vertices.splice(options.vertexIndex * 2, 2, options.x, options.y)
  const mesh = {...part.mesh, uvs: resample(part.mesh.uvs, 2), vertices}
  if (
    !validateMesh(mesh).valid ||
    !hasSameWinding(part.mesh.indices, part.mesh.vertices, vertices)
  ) {
    return {message: '메시가 겹치거나 뒤집히는 위치로 이동할 수 없습니다.', ok: false}
  }
  let valid = true
  const remapBinding = <T extends PuppetParameterBinding>(binding: T): T => ({
    ...binding,
    keyforms: binding.keyforms.map((keyform) => ({
      ...keyform,
      parts: keyform.parts.map((entry) => {
        if (entry.partId !== part.id) {
          return entry
        }
        const updated = resample(entry.vertices, 2)
        valid &&= hasSameWinding(part.mesh.indices, entry.vertices, updated)
        return {...entry, vertices: updated}
      }),
    })),
  })
  const parameterBindings = options.document.parameterBindings?.map(remapBinding)
  if (!valid) {
    return {message: '기존 키폼이 뒤집히는 위치로 이동할 수 없습니다.', ok: false}
  }
  const remapNode = (node: PuppetSceneNode): PuppetSceneNode => {
    if (node.kind === 'part') {
      return node.id === part.id && node.skinning !== undefined
        ? {
            ...node,
            skinning: {
              ...node.skinning,
              influences: node.skinning.influences.map((influence) => ({
                ...influence,
                weights: resample(influence.weights),
              })),
            },
          }
        : node
    }
    const children = node.children.map(remapNode)
    if (node.kind === 'group') {
      return {...node, children}
    }
    return {
      ...node,
      ...remapShape({part, sample, sampleValues, shape: node, vertexIndex: options.vertexIndex}),
      binding:
        node.binding === undefined
          ? undefined
          : {
              ...node.binding,
              rest: remapShape({
                part,
                sample,
                sampleValues,
                shape: node.binding.rest,
                vertexIndex: options.vertexIndex,
              }),
              steps: node.binding.steps.map((step) => ({
                ...step,
                rest:
                  step.rest === undefined
                    ? undefined
                    : remapShape({
                        part,
                        sample,
                        shape: step.rest,
                        sampleValues,
                        vertexIndex: options.vertexIndex,
                      }),
                shape: remapShape({
                  part,
                  sample,
                  shape: step.shape,
                  sampleValues,
                  vertexIndex: options.vertexIndex,
                }),
              })),
            },
      children,
    }
  }
  return {
    document: {
      ...options.document,
      parameterBindings,
      parts: options.document.parts.map((candidate) =>
        candidate.id === part.id ? {...part, mesh} : candidate,
      ),
      scene:
        options.document.scene === undefined
          ? undefined
          : {...options.document.scene, roots: options.document.scene.roots.map(remapNode)},
    },
    ok: true,
  }
}
