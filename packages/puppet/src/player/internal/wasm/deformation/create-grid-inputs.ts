import {
  getParameterBindingValues,
  type PuppetParameterValueMap,
} from '../../../../deformation/composition'
import {getBindingInfluence} from '../../../../deformation/influence'
import {getGridCorners} from '../../../../deformation/sample-grid-coordinates'
import {getTargetBindings} from '../../../../deformation/target-bindings'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../../../document'
import {getRepeatRanges} from '../../../parameter-value'

export interface GridMemory {
  /** Copies immutable model coordinates into instance-owned storage. */
  copy(values: ArrayLike<number>): number
  /** Allocates zero-initialized Float64 storage, released with the instance. */
  reserve(length: number): number
  /** Returns a borrowed view, valid until an allocation grows linear memory. */
  storage(pointer: number, length: number): Float64Array
}
export interface GridInputs {
  readonly bindings: number
  readonly count: number
  update(values: PuppetParameterValueMap | undefined): boolean
}

/** Retains keyform arrays; only interpolation samples change between frames. */
export const createGridInputs = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
  memory: GridMemory,
  restPointer: number,
): GridInputs => {
  const bindings = getTargetBindings(document.parameterBindings ?? [], 'targetDeformerIds', node.id)
  const prepared = bindings.map((binding) => {
    const parameterIds = [
      ...new Set([
        ...binding.parameterIds,
        ...(binding.influences ?? []).map((entry) => entry.parameterId),
      ]),
    ]
    let previous: ReadonlyArray<number | undefined> | undefined
    const forms = binding.keyforms.map((form) => {
      const coordinates = form.deformers?.find((entry) => entry.nodeId === node.id)?.controlPoints
      return coordinates === undefined
        ? restPointer
        : memory.copy(node.controlPoints.map((rest, index) => coordinates[index] ?? rest))
    })
    const samplesPointer = memory.reserve(2 ** binding.parameterIds.length * 2)
    const pointer = memory.copy([0, 0, samplesPointer])
    const repeatRanges = getRepeatRanges(binding.parameterIds, document.parameters)
    return {
      parameterIds,
      pointer,
      update(parameterValues: PuppetParameterValueMap | undefined) {
        if (
          previous !== undefined &&
          parameterIds.every((id, index) => Object.is(parameterValues?.[id], previous![index]))
        ) {
          return
        }
        const corners = getGridCorners({
          binding,
          keyformCoordinates: [],
          repeatRanges,
          restCoordinates: node.controlPoints,
          values: getParameterBindingValues({binding, document, parameterValues}),
        })
        const BINDING_FIELDS = 3
        const data = memory.storage(pointer, BINDING_FIELDS)
        data[0] = corners.length
        data[1] = getBindingInfluence({binding, document, parameterValues})
        const samples = memory.storage(samplesPointer, corners.length * 2)
        corners.forEach((corner, index) => {
          samples[index * 2] = forms[corner.index] ?? restPointer
          samples[index * 2 + 1] = corner.weight
        })
        previous = parameterIds.map((id) => parameterValues?.[id])
      },
    }
  })
  const parameterIds = [...new Set(prepared.flatMap((binding) => binding.parameterIds))]
  let previous: ReadonlyArray<number | undefined> | undefined
  return {
    bindings: memory.copy(prepared.map((binding) => binding.pointer)),
    count: prepared.length,
    update(values) {
      if (
        previous !== undefined &&
        parameterIds.every((id, index) => Object.is(previous![index], values?.[id]))
      ) {
        return false
      }
      prepared.forEach((binding) => binding.update(values))
      previous = parameterIds.map((id) => values?.[id])
      return true
    },
  }
}
