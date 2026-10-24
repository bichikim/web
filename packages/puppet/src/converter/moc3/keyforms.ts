import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterKeyformBase,
} from '../../player/document'
import {sampleGridCoordinates} from '../../deformation/sample-grid-coordinates'
import {createCubismBindings} from '../create-cubism-bindings'
import type {Moc3Model} from '../read-moc3'
import type {Moc3Record, NativeForm, NativeObject} from './types'
import {column, numberAt, range} from './tables'
import {MOC3_SAMPLING} from './sampling'

const readAxes = (
  model: Moc3Model,
  binding: number,
  parameters: ReadonlyArray<PuppetParameter>,
) => {
  const references = range(
    column(model, 'bindingIndices', 'values'),
    numberAt(model, 'keyformBindings', 'begin', binding),
    numberAt(model, 'keyformBindings', 'count', binding),
  )
  return references.map((index) => {
    const parameter = parameters.find((_, parameterIndex) => {
      const begin = numberAt(model, 'parameters', 'bindingBegin', parameterIndex)
      return (
        index >= begin &&
        index < begin + numberAt(model, 'parameters', 'bindingCount', parameterIndex)
      )
    })
    if (parameter === undefined) {
      throw new Error(`MOC3 parameter binding ${index} has no parameter`)
    }
    return {
      keys: range(
        column(model, 'keys', 'values'),
        numberAt(model, 'parameterBindings', 'begin', index),
        numberAt(model, 'parameterBindings', 'count', index),
      ),
      parameter,
    }
  })
}

const formValues = (keys: ReadonlyArray<ReadonlyArray<number>>, index: number) => {
  let stride = 1
  return keys.map((axis) => {
    const value = axis[Math.floor(index / stride) % axis.length]!
    stride *= axis.length
    return value
  })
}

export const readForms = (
  model: Moc3Model,
  source: Moc3Record,
  parameters: ReadonlyArray<PuppetParameter>,
  form: (index: number) => PuppetParameterKeyformBase,
) => {
  const {table, index} = source
  const axes = readAxes(model, numberAt(model, table, 'binding', index), parameters)
  const count = numberAt(model, table, 'count', index)
  const begin = numberAt(model, table, 'begin', index)
  if (axes.reduce((total, axis) => total * axis.keys.length, 1) !== count) {
    throw new Error(`MOC3 ${table} keyform grid is incomplete`)
  }
  const forms = Array.from({length: count}, (_, offset) => ({
    ...form(begin + offset),
    values: formValues(
      axes.map((axis) => axis.keys),
      offset,
    ),
  })).sort((first, second) => (first.values[0] ?? 0) - (second.values[0] ?? 0))
  const visibilityRanges = axes.flatMap(({keys, parameter}) => {
    const minimum = Math.min(...keys)
    const maximum = Math.max(...keys)
    return minimum <= parameter.minimum && maximum >= parameter.maximum
      ? []
      : [
          {
            maximum: Math.fround(maximum + MOC3_SAMPLING.keyTolerance),
            minimum: Math.fround(minimum - MOC3_SAMPLING.keyTolerance),
            parameterId: parameter.id,
            precision: 'float32' as const,
          },
        ]
  })
  return {axes: axes.map((axis) => axis.parameter), forms, visibilityRanges}
}

export const createBindings = (object: NativeObject): ReadonlyArray<PuppetParameterBinding> =>
  createCubismBindings({
    id: `moc3:${object.id}`,
    interpolation: 'grid',
    keyforms: object.forms,
    parameterIds: object.axes.map((axis) => axis.id),
    sampling: MOC3_SAMPLING,
    ...(object.node.kind === 'part'
      ? {targetPartIds: [object.id]}
      : object.node.kind === 'group'
        ? {targetGroupIds: [object.id]}
        : {targetDeformerIds: [object.id]}),
  })

export const defaultCoordinates = (
  object: NativeObject,
  read: (form: NativeForm) => ReadonlyArray<number>,
  step = false,
) => {
  const [first] = object.forms
  if (first === undefined) {
    throw new Error(`MOC3 ${object.id} has no keyform`)
  }
  if (object.axes.length === 0) {
    return read(first)
  }
  const values = object.axes.map((axis) => axis.defaultValue)
  return sampleGridCoordinates({
    binding: {
      keyforms: object.forms,
      parameterIds: object.axes.map((axis) => axis.id),
      sampling: MOC3_SAMPLING,
    },
    keyformCoordinates: object.forms.map(read),
    repeatRanges: object.axes.map((axis) =>
      axis.repeat === true ? [axis.minimum, axis.maximum] : undefined,
    ),
    restCoordinates: read(first),
    ...(step ? {sampling: 'step' as const} : {}),
    values,
  })
}
