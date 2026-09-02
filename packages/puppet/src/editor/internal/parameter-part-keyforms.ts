import {isTwoDimensionalParameterBinding, type PuppetParameterValues} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterKeyform,
  PuppetParameterPartKeyform,
} from '../../player'
import {movePartVertex} from '../edit-document'
import {
  getDocumentParameterBindings,
  getParameterBinding,
  getParameterTargetPartIds,
} from './parameter-keyforms'

export interface SetParameterKeyformVertexOptions {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly partId: string
  readonly values: PuppetParameterValues
  readonly vertexIndex: number
  readonly x: number
  readonly y: number
}

const getPartVertices = (
  keyform: PuppetParameterKeyform,
  partId: string,
  restVertices: ReadonlyArray<number>,
) => keyform.parts.find((part) => part.partId === partId)?.vertices ?? restVertices

const replacePart = (
  parts: ReadonlyArray<PuppetParameterPartKeyform>,
  part: PuppetParameterPartKeyform,
) =>
  parts.some((candidate) => candidate.partId === part.partId)
    ? parts.map((candidate) => (candidate.partId === part.partId ? part : candidate))
    : [...parts, part]

export const setParameterKeyformVertex = (options: SetParameterKeyformVertexOptions) => {
  const binding = getParameterBinding(options.document, options.bindingId)
  const keyform = binding?.keyforms.find(
    (candidate) =>
      candidate.values.length === options.values.length &&
      candidate.values.every((value, index) => value === options.values[index]),
  )
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (binding === undefined || keyform === undefined || part === undefined) {
    return undefined
  }
  if (!getParameterTargetPartIds(binding).includes(part.id)) {
    return undefined
  }

  const vertices = [...getPartVertices(keyform, part.id, part.mesh.vertices)]
  const coordinateIndex = options.vertexIndex * 2
  vertices[coordinateIndex] = options.x
  vertices[coordinateIndex + 1] = options.y
  const validation = movePartVertex({
    document: {
      ...options.document,
      parts: options.document.parts.map((candidate) =>
        candidate.id === part.id ? {...candidate, mesh: {...candidate.mesh, vertices}} : candidate,
      ),
    },
    partId: part.id,
    vertexIndex: options.vertexIndex,
    x: options.x,
    y: options.y,
  })
  if (!validation.ok) {
    return undefined
  }

  const update = (candidate: PuppetParameterBinding): PuppetParameterBinding => {
    const replaceKeyform = <Keyform extends PuppetParameterKeyform>(value: Keyform): Keyform =>
      value.values.length === keyform.values.length &&
      value.values.every((coordinate, index) => coordinate === keyform.values[index])
        ? {...value, parts: replacePart(value.parts, {partId: part.id, vertices})}
        : value
    return isTwoDimensionalParameterBinding(candidate)
      ? {...candidate, keyforms: candidate.keyforms.map(replaceKeyform)}
      : {...candidate, keyforms: candidate.keyforms.map(replaceKeyform)}
  }
  return {
    ...options.document,
    parameterBindings: getDocumentParameterBindings(options.document).map((candidate) =>
      candidate.id === binding.id ? update(candidate) : candidate,
    ),
  }
}
