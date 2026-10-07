import {parameterValuesEqual, type PuppetParameterValues} from '../../deformation'
import type {PuppetParameterDeformerKeyform, PuppetSceneDeformerNode} from '../../player'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  rotateDeformerControlPoints,
} from './deformer-transform'
import {
  getKeyformGenerationContext,
  type KeyformGenerationFailure,
  type KeyformGenerationSuccess,
  type KeyformGenerationTarget,
  replaceGeneratedKeyforms,
  sampleBindingKeyform,
} from './keyform-generation'
import {mirrorVertexOffsets} from './mirror-vertex-offsets'

export interface MirrorKeyformSettings {
  readonly axis: 'x' | 'y'
  readonly center: number
  readonly parameterIndex: number
  readonly overwrite: boolean
}
interface MirrorKeyformOptions extends KeyformGenerationTarget, MirrorKeyformSettings {
  readonly values: PuppetParameterValues
}
interface MirrorKeyformSuccess extends KeyformGenerationSuccess {
  readonly values: PuppetParameterValues
}
type MirrorKeyformResult = MirrorKeyformSuccess | KeyformGenerationFailure

const MIRROR_ANGLE_FACTOR = -2

const mirrorDeformer = (
  node: PuppetSceneDeformerNode,
  source: PuppetParameterDeformerKeyform,
  base: PuppetParameterDeformerKeyform,
  axis: 'x' | 'y',
): PuppetParameterDeformerKeyform => {
  const reference = {...node, ...base}
  const posed = {...node, ...source}
  const origin = getDeformerRotationOrigin(reference)
  const sourceOrigin = getDeformerRotationOrigin(posed)
  const rotationOrigin = {
    x: origin.x + (sourceOrigin.x - origin.x) * (axis === 'x' ? -1 : 1),
    y: origin.y + (sourceOrigin.y - origin.y) * (axis === 'y' ? -1 : 1),
  }
  if (node.deformerType === 'rotation') {
    const rotated = rotateDeformerControlPoints({
      controlPoints: source.controlPoints,
      degrees: MIRROR_ANGLE_FACTOR * (getDeformerAngle(posed) - getDeformerAngle(reference)),
      origin: sourceOrigin,
    })
    return {
      ...source,
      controlPoints: rotated.map(
        (value, index) =>
          value +
          (index % 2 === 0 ? rotationOrigin.x - sourceOrigin.x : rotationOrigin.y - sourceOrigin.y),
      ),
      rotationOrigin,
    }
  }
  const stride = node.columns + 1
  const indices = Array.from({length: node.rows * node.columns}, (_, index) => {
    const start = Math.floor(index / node.columns) * stride + (index % node.columns)
    return [start, start + 1, start + stride, start + 1, start + stride + 1, start + stride]
  }).flat()
  const mirror = (vertices: readonly number[]) =>
    mirrorVertexOffsets({
      axis,
      center: origin[axis],
      indices,
      reference: base.controlPoints,
      vertices,
    })
  const curveHandles = base.curveHandles?.map((handle) => {
    const mirroredIndex =
      axis === 'x'
        ? Math.floor(handle.pointIndex / stride) * stride +
          node.columns -
          (handle.pointIndex % stride)
        : (node.rows - Math.floor(handle.pointIndex / stride)) * stride +
          (handle.pointIndex % stride)
    const sourceHandle = source.curveHandles?.find((entry) => entry.pointIndex === mirroredIndex)
    const baseHandle = base.curveHandles?.find((entry) => entry.pointIndex === mirroredIndex)
    const reflect = (direction: 'horizontal' | 'vertical') => ({
      x:
        handle[direction].x +
        ((sourceHandle?.[direction].x ?? 0) - (baseHandle?.[direction].x ?? 0)) *
          (axis === 'x' ? -1 : 1),
      y:
        handle[direction].y +
        ((sourceHandle?.[direction].y ?? 0) - (baseHandle?.[direction].y ?? 0)) *
          (axis === 'y' ? -1 : 1),
    })
    return {...handle, horizontal: reflect('horizontal'), vertical: reflect('vertical')}
  })
  return {...source, controlPoints: mirror(source.controlPoints), curveHandles, rotationOrigin}
}

/** Copies a reflected mesh, warp, or rotation form to the parameter value opposite its default. */
export const mirrorKeyform = (options: MirrorKeyformOptions): MirrorKeyformResult => {
  const context = getKeyformGenerationContext(options)
  if (!context.ok) {
    return context
  }
  const {binding, parameters, parts, deformers} = context
  const parameter = parameters[options.parameterIndex]
  const source = binding.keyforms.find((keyform) =>
    parameterValuesEqual(keyform.values, options.values),
  )
  if (parameter === undefined || source === undefined || !Number.isFinite(options.center)) {
    return {message: '반전할 키폼과 파라미터 축을 선택하세요.', ok: false}
  }
  if (
    deformers.some(
      (node) =>
        node.deformerType === 'spatial' ||
        node.curveAxis !== undefined ||
        (node.boneRestPoints !== undefined && node.deformerType !== 'rotation') ||
        node.pins !== undefined,
    ) ||
    parts.some((part) => part.spatial !== undefined)
  ) {
    return {message: '동작 반전은 2D 메시·워프·회전 디포머에서 지원합니다.', ok: false}
  }
  const opposite = 2 * parameter.defaultValue - options.values[options.parameterIndex]!
  if (
    opposite === parameter.defaultValue ||
    opposite < parameter.minimum ||
    opposite > parameter.maximum
  ) {
    return {
      message: '기본값은 반전할 수 없으며 반대 값은 파라미터 범위 안에 있어야 합니다.',
      ok: false,
    }
  }
  const target = options.values.map((value, index) =>
    index === options.parameterIndex ? opposite : value,
  )
  const values: PuppetParameterValues =
    target.length === 2 ? [target[0]!, target[1]!] : [target[0]!]
  if (
    !options.overwrite &&
    binding.keyforms.some((keyform) => parameterValuesEqual(keyform.values, values))
  ) {
    return {message: '반대 값에 이미 키폼이 있습니다. 덮어쓰기를 선택하세요.', ok: false}
  }
  const defaults: PuppetParameterValues =
    parameters.length === 2
      ? [parameters[0]!.defaultValue, parameters[1]!.defaultValue]
      : [parameters[0]!.defaultValue]
  const base = sampleBindingKeyform(options, binding, defaults, deformers)
  const sampled = sampleBindingKeyform(options, binding, options.values, deformers)
  const geometry = {
    deformers: sampled.deformers?.map((entry) =>
      mirrorDeformer(
        deformers.find((node) => node.id === entry.nodeId)!,
        entry,
        base.deformers!.find((node) => node.nodeId === entry.nodeId)!,
        options.axis,
      ),
    ),
    parts: sampled.parts.map((entry) => {
      const part = parts.find((candidate) => candidate.id === entry.partId)!
      const reference = base.parts.find((candidate) => candidate.partId === entry.partId)!
      return {
        ...entry,
        vertices: mirrorVertexOffsets({
          axis: options.axis,
          center: options.center,
          indices: part.mesh.indices,
          reference: reference.vertices,
          vertices: entry.vertices,
        }),
      }
    }),
  }
  const mirrored =
    values.length === 2
      ? {...geometry, values: [values[0], values[1]] as const}
      : {...geometry, values: [values[0]] as const}
  const result = replaceGeneratedKeyforms(options, binding, [mirrored])
  return result.ok ? {...result, values} : result
}
