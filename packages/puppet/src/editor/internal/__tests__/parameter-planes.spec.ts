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
  const added = addThreeDimensionalParameter({document: source, nodeIds: ['mesh-preview']})
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
  test('should create three planes of a three-by-three grid', () => {
    const {binding, document} = createBinding()
    expect(document.parameters?.map((parameter) => parameter.name)).toEqual([
      'Parameter 1 X',
      'Parameter 1 Y',
      'Parameter 1 Z',
    ])
    expect(binding.keyforms).toHaveLength(27)
    expect(binding.keyforms.slice(0, 2).map((keyform) => keyform.values)).toEqual([
      [-30, -30, -30],
      [0, -30, -30],
    ])
    expect(parseDocumentValue(document).ok).toBe(true)
  })

  test('should keep the grid complete when inserting a point or a plane', () => {
    const {binding, document} = createBinding()
    const point = insertParameterKeyform({bindingId: binding.id, document, values: [15, 0, 0]})
    expect(valuesOf(point)).toHaveLength(30)
    expect(valuesOf(point).filter((values) => values[0] === 15 && values[1] === 0)).toHaveLength(3)

    const plane = insertParameterKeyform({bindingId: binding.id, document, values: [0, 0, 10]})
    expect(valuesOf(plane)).toHaveLength(36)
    expect(planesOf(plane)).toEqual([-30, 0, 10, 30])
    expect(parseDocumentValue(plane!).ok).toBe(true)
    const sorted = valuesOf(plane).toSorted(compareKeyformValues)
    expect(valuesOf(plane)).toEqual(sorted)
  })

  test('should delete a point from every plane, or one plane', () => {
    const {binding, document} = createBinding()
    const point = deleteParameterKeyform({bindingId: binding.id, document, values: [0, 0, 30]})
    expect(valuesOf(point)).toHaveLength(24)
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

  test('should move a point in every plane or a whole plane, not both', () => {
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
    expect(valuesOf(point).filter((values) => values[0] === 5 && values[1] === 5)).toHaveLength(3)
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
