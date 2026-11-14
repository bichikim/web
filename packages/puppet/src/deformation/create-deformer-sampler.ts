import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetSceneDeformerNode,
} from '../player/document'
import {getRepeatRanges} from '../player/parameter-value'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {getBindingInfluence} from './influence'
import {getCoordinateReader} from './internal/deferred-coordinates'
import {createGridCoordinateSampler} from './sample-grid-coordinates'
import {composeParameterDeformer} from './scene'
import {getTargetBindings} from './target-bindings'

export interface DeformerSampler {
  /** Samples one in-range scalar coordinate of the current owner-scoped frame. */
  sample(index: number): number
  /** Samples both axes into caller-owned storage without changing scalar sampling semantics. */
  samplePoint(point: number, output: DeformerPointOutput): void
  /** Updates frame inputs and reports whether coordinates may have changed. */
  update(values?: PuppetParameterValueMap): boolean
}

export interface DeformerPointOutput {
  x: number
  y: number
}

interface BindingSample {
  readonly sample: (index: number) => number
  readonly weight: number
}

/** One binding's sampled channels outlive changes to other bindings of the same deformer. */
const createBindingSampler = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
  binding: PuppetParameterBinding,
): ((values: PuppetParameterValueMap | undefined) => BindingSample) => {
  const keyformCoordinates = binding.keyforms.map(
    (form) => form.deformers?.find((entry) => entry.nodeId === node.id)?.controlPoints,
  )
  const repeatRanges = getRepeatRanges(binding.parameterIds, document.parameters)
  const coordinates = new Float64Array(node.controlPoints.length)
  const initialized = new Uint32Array(node.controlPoints.length)
  let previous: ReadonlyArray<number> | undefined
  let version = 0
  let read: (index: number) => number = (index) => node.controlPoints[index]!
  const sample = (index: number): number => {
    if (initialized[index] !== version) {
      coordinates[index] = read(index)
      initialized[index] = version
    }
    return coordinates[index]!
  }
  return (parameterValues) => {
    const values = getParameterBindingValues({binding, document, parameterValues})
    if (
      previous === undefined ||
      !values.every((value, index) => Object.is(value, previous![index]))
    ) {
      read = createGridCoordinateSampler({
        binding,
        keyformCoordinates,
        repeatRanges,
        restCoordinates: node.controlPoints,
        values,
      })
      previous = values
      version += 1
      const MAXIMUM_VERSION = 0xffff_ffff
      if (version > MAXIMUM_VERSION) {
        initialized.fill(0)
        version = 1
      }
    }
    return {sample, weight: getBindingInfluence({binding, document, parameterValues})}
  }
}

/** Mutable runtime sampling state; document arrays and canonical frame snapshots stay unchanged. */
export const createDeformerSampler = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
): DeformerSampler => {
  const bindings = getTargetBindings(document.parameterBindings ?? [], 'targetDeformerIds', node.id)
  if (
    node.deformerType !== undefined ||
    node.rotationAngle !== undefined ||
    bindings.some((binding) => binding.interpolation !== 'grid')
  ) {
    let previous: PuppetSceneDeformerNode | undefined
    let read = getCoordinateReader(node.controlPoints)
    return {
      sample: (index) => read(index)!,
      samplePoint(point, output) {
        output.x = read(point * 2)!
        output.y = read(point * 2 + 1)!
      },
      update(values) {
        const posed = composeParameterDeformer(document, node, values)
        const changed = previous !== posed
        previous = posed
        read = getCoordinateReader(posed.controlPoints)
        return changed
      },
    }
  }
  const prepared = bindings.map((binding) => createBindingSampler(document, node, binding))
  const parameterIds = [
    ...new Set(
      bindings.flatMap((binding) => [
        ...binding.parameterIds,
        ...(binding.influences ?? []).map((entry) => entry.parameterId),
      ]),
    ),
  ]
  let previousValues: ReadonlyArray<number | undefined> | undefined
  const coordinates = new Float64Array(node.controlPoints.length)
  const initialized = new Uint32Array(node.controlPoints.length)
  let version = 1
  let inputs: ReadonlyArray<BindingSample> = []
  const sample = (index: number): number => {
    if (initialized[index] !== version) {
      const rest = node.controlPoints[index]!
      let coordinate = rest
      for (const input of inputs) {
        coordinate += (input.sample(index) - rest) * input.weight
      }
      coordinates[index] = coordinate
      initialized[index] = version
    }
    return coordinates[index]!
  }
  return {
    sample,
    samplePoint(point, output) {
      const horizontal = point * 2
      const vertical = horizontal + 1
      const missingX = initialized[horizontal] !== version
      const missingY = initialized[vertical] !== version
      if (missingX && missingY) {
        const restX = node.controlPoints[horizontal]!
        const restY = node.controlPoints[vertical]!
        let x = restX
        let y = restY
        for (const input of inputs) {
          x += (input.sample(horizontal) - restX) * input.weight
          y += (input.sample(vertical) - restY) * input.weight
        }
        coordinates[horizontal] = x
        coordinates[vertical] = y
        initialized[horizontal] = version
        initialized[vertical] = version
      } else if (missingX || missingY) {
        sample(horizontal)
        sample(vertical)
      }
      output.x = coordinates[horizontal]!
      output.y = coordinates[vertical]!
    },
    update(parameterValues) {
      if (
        previousValues !== undefined &&
        parameterIds.every((id, index) => Object.is(previousValues![index], parameterValues?.[id]))
      ) {
        return false
      }
      inputs = prepared.map((sample) => sample(parameterValues))
      previousValues = parameterIds.map((id) => parameterValues?.[id])
      const MAXIMUM_VERSION = 0xffff_ffff
      version += 1
      if (version > MAXIMUM_VERSION) {
        initialized.fill(0)
        version = 1
      }
      return true
    },
  }
}
