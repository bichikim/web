import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterInfluence,
  PuppetParameterKeyformBase,
} from '../../player/document'
import type {Moc3Model} from '../read-moc3'
import {createCubismBinding} from '../create-cubism-binding'
import {column, numberAt, range} from './tables'
import {MOC3_SAMPLING} from './sampling'
import type {Moc3Record} from './types'

const readInfluences = (
  model: Moc3Model,
  index: number,
  parameters: ReadonlyArray<PuppetParameter>,
): ReadonlyArray<PuppetParameterInfluence> =>
  range(
    column(model, 'constraintIndices', 'values'),
    numberAt(model, 'blendKeyforms', 'constraintBegin', index),
    numberAt(model, 'blendKeyforms', 'constraintCount', index),
  ).map((constraint) => {
    const parameter = parameters[numberAt(model, 'constraints', 'parameter', constraint)]
    if (parameter === undefined) {
      throw new Error('MOC3 blend shape constraint references a missing parameter')
    }
    const begin = numberAt(model, 'constraints', 'begin', constraint)
    const count = numberAt(model, 'constraints', 'count', constraint)
    return {
      parameterId: parameter.id,
      points: Array.from({length: count}, (_, offset) => ({
        value: numberAt(model, 'constraintValues', 'key', begin + offset),
        weight: numberAt(model, 'constraintValues', 'weight', begin + offset),
      })),
    }
  })

/** Reads every additive keyform binding that targets a native record. */
export const readBlendBindings = (
  model: Moc3Model,
  target: Moc3Record &
    Pick<
      PuppetParameterBinding,
      'id' | 'targetPartIds' | 'targetGroupIds' | 'targetDeformerIds' | 'targetGlueIds'
    >,
  parameters: ReadonlyArray<PuppetParameter>,
  readForm: (index: number) => PuppetParameterKeyformBase,
): ReadonlyArray<PuppetParameterBinding> => {
  const indices = column(model, target.table, 'target').flatMap((value, entry) =>
    value === target.index
      ? Array.from(
          {length: numberAt(model, target.table, 'count', entry)},
          (_, offset) => numberAt(model, target.table, 'begin', entry) + offset,
        )
      : [],
  )
  return indices.map((index) => {
    const binding = numberAt(model, 'blendKeyforms', 'binding', index)
    const parameter = parameters.find((_, parameterIndex) => {
      const begin = column(model, 'parameters', 'blendBegin')[parameterIndex] ?? -1
      return (
        binding >= begin &&
        binding < begin + (column(model, 'parameters', 'blendCount')[parameterIndex] ?? 0)
      )
    })
    if (parameter === undefined) {
      throw new Error('MOC3 blend shape has no parameter')
    }
    const keys = range(
      column(model, 'keys', 'values'),
      numberAt(model, 'blendBindings', 'begin', binding),
      numberAt(model, 'blendBindings', 'count', binding),
    )
    const begin = numberAt(model, 'blendKeyforms', 'begin', index)
    if (numberAt(model, 'blendKeyforms', 'count', index) !== keys.length) {
      throw new Error('MOC3 blend shape keyform grid is incomplete')
    }
    const {table: _table, index: _index, id, ...targets} = target
    return createCubismBinding({
      ...targets,
      id: `${id}:${index}`,
      influences: readInfluences(model, index, parameters),
      interpolation: 'grid',
      keyformRange: 'unbounded',
      keyforms: keys.map((value, key) => ({...readForm(begin + key), values: [value]})),
      parameterIds: [parameter.id],
      sampling: {...MOC3_SAMPLING, keyTolerance: 0},
    })
  })
}
