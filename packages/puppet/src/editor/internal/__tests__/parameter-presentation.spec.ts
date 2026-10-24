import {expect, test} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {getParameterPresentation, getVisibleParameters} from '../parameter-presentation'

test('should preserve ordinary bindings and both visible coordinates without physics', () => {
  const document = createDemoDocument()
  const binding = document.parameterBindings![0]!
  const presentation = getParameterPresentation(document, [binding])
  expect(presentation.bindings[0]).toBe(binding)
  expect(presentation.parameters).toEqual(document.parameters)
  expect(presentation.previewBindingIds.size).toBe(0)
  expect(presentation.projectValues(binding.id, [10, 20])).toEqual([10, 20])
  expect(presentation.expandValues(binding.id, [10, 20], {})).toEqual([10, 20])
})

test('should hide output-only bindings and retain the hidden baseline when expanding a projected input', () => {
  const source = createDemoDocument()
  const mixed = source.parameterBindings![0]!
  const document: PuppetDocument = {
    ...source,
    parameterBindings: [
      mixed,
      {id: 'output-only', keyforms: [], parameterIds: ['angle-y'], targetPartIds: ['mesh-preview']},
    ],
    physics: {
      pendulums: [
        {
          damping: 1.2,
          gravity: 9.8,
          id: 'hair',
          inputParameterId: 'angle-x',
          inputScale: 1,
          length: 1,
          outputParameterId: 'angle-y',
          outputScale: 1,
        },
      ],
    },
  }
  const before = JSON.stringify(document)
  const presentation = getParameterPresentation(document, document.parameterBindings!)
  expect(getVisibleParameters(document).map((parameter) => parameter.id)).toEqual(['angle-x'])
  expect(presentation.bindings).toHaveLength(1)
  expect(presentation.bindings[0]?.parameterIds).toEqual(['angle-x'])
  expect(presentation.bindings[0]?.keyforms).toEqual([])
  expect(presentation.projectValues(mixed.id, [10, 7])).toEqual([10])
  expect(presentation.expandValues(mixed.id, [20], {'angle-y': 7})).toEqual([20, 7])
  expect(presentation.expandValues(mixed.id, [20], {})).toEqual([20, 0])
  expect(presentation.expandValues('output-only', [20], {})).toBeUndefined()
  expect(presentation.projectValues('missing', [0])).toBeUndefined()
  expect(JSON.stringify(document)).toBe(before)
})

test('should hide both output axes in a chained physics-only binding', () => {
  const source = createDemoDocument()
  const document: PuppetDocument = {
    ...source,
    physics: {
      pendulums: [
        {
          damping: 1.2,
          gravity: 9.8,
          id: 'first',
          inputParameterId: 'driver',
          inputScale: 1,
          length: 1,
          outputParameterId: 'angle-x',
          outputScale: 1,
        },
        {
          damping: 1.2,
          gravity: 9.8,
          id: 'second',
          inputParameterId: 'angle-x',
          inputScale: 1,
          length: 1,
          outputParameterId: 'angle-y',
          outputScale: 1,
        },
      ],
    },
  }
  const presentation = getParameterPresentation(document, source.parameterBindings!)
  expect(presentation.bindings).toEqual([])
  expect(presentation.parameters).toEqual([])
})
