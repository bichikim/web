import {createKeyedParameter3D} from './parameter-keyforms/fixtures'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue} from '../../../player'
import type {PuppetDocument} from '../../../player/document'
import {compareKeyformValues} from '../keyform-grid'
import {
  addThreeDimensionalParameter,
  deleteParameterKeyform,
  deleteParameterKeyformPlane,
  insertParameterKeyform,
  moveParameterKeyform,
} from '../parameter-keyforms'

const createBinding = () => {
  const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
  const added = createKeyedParameter3D({document: source, nodeIds: ['mesh-preview']})
  if (added === undefined) {
    throw new Error('the demo mesh should accept a parameter')
  }
  return added
}

const valuesOf = (document: PuppetDocument | undefined) =>
  document?.parameterBindings?.[0]?.keyforms.map((keyform) => keyform.values) ?? []

const planesOf = (document: PuppetDocument | undefined) => [
  ...new Set(valuesOf(document).map((values) => values[2])),
]

describe('three-parameter keyform editing', () => {
  test('should create a three-dimensional parameter without keyforms', () => {
    const {binding, document} = addThreeDimensionalParameter({
      document: {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []},
      nodeIds: ['mesh-preview'],
    })!
    expect(document.parameters?.map((parameter) => parameter.name)).toEqual([
      'Parameter 1 X',
      'Parameter 1 Y',
      'Parameter 1 Z',
    ])
    expect(binding.keyforms).toEqual([])
    expect(parseDocumentValue(document).ok).toBe(true)
  })

  test('should insert only the requested keyform in its Z plane', () => {
    const {binding, document} = createBinding()
    const point = insertParameterKeyform({bindingId: binding.id, document, values: [15, 0, 0]})
    expect(valuesOf(point)).toHaveLength(28)
    expect(valuesOf(point).filter((values) => values[0] === 15 && values[1] === 0)).toHaveLength(1)

    const plane = insertParameterKeyform({bindingId: binding.id, document, values: [0, 0, 10]})
    expect(valuesOf(plane)).toHaveLength(28)
    expect(planesOf(plane)).toEqual([-30, 0, 10, 30])
    expect(parseDocumentValue(plane!).ok).toBe(true)
    const sorted = valuesOf(plane).toSorted(compareKeyformValues)
    expect(valuesOf(plane)).toEqual(sorted)
  })

  test('should delete only the selected keyform, or an explicit whole plane', () => {
    const {binding, document} = createBinding()
    const point = deleteParameterKeyform({bindingId: binding.id, document, values: [0, 0, 30]})
    expect(valuesOf(point)).toHaveLength(26)
    expect(valuesOf(point)).toContainEqual([0, 0, -30])
    expect(valuesOf(point)).toContainEqual([0, 0, 0])
    expect(parseDocumentValue(point!).ok).toBe(true)

    const plane = deleteParameterKeyformPlane({bindingId: binding.id, document, value: 30})
    expect(planesOf(plane)).toEqual([-30, 0])
    const onlyPlane = [-30, 0].reduce<PuppetDocument | undefined>(
      (current, value) =>
        current && deleteParameterKeyformPlane({bindingId: binding.id, document: current, value}),
      document,
    )
    expect(
      onlyPlane &&
        deleteParameterKeyformPlane({bindingId: binding.id, document: onlyPlane, value: 30}),
    ).toBeUndefined()
  })

  test('should move XY only in its plane or move an explicit whole plane', () => {
    const {binding, document} = createBinding()
    const plane = moveParameterKeyform({
      bindingId: binding.id,
      document,
      nextValues: [0, 0, -20],
      values: [0, 0, -30],
    })
    expect(planesOf(plane)).toEqual([-20, 0, 30])

    const point = moveParameterKeyform({
      bindingId: binding.id,
      document,
      nextValues: [5, 5, 0],
      values: [0, 0, 0],
    })
    expect(valuesOf(point).filter((values) => values[0] === 5 && values[1] === 5)).toHaveLength(1)
    expect(parseDocumentValue(point!).ok).toBe(true)

    expect(
      moveParameterKeyform({
        bindingId: binding.id,
        document,
        nextValues: [5, 5, 5],
        values: [0, 0, 0],
      }),
    ).toBeUndefined()
    // Onto an existing plane.
    expect(
      moveParameterKeyform({
        bindingId: binding.id,
        document,
        nextValues: [0, 0, 0],
        values: [0, 0, 30],
      }),
    ).toBeUndefined()
  })
})
