import {isTwoDimensionalParameterBinding} from '../parameter'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player'
import {addGlue} from '../../editor/internal/glue'
import {composeParameterGlue} from '../parameter-glue'

const createDocument = () => {
  const document = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  return {
    ...document,
    parameterBindings: document.parameterBindings!.map((binding) => {
      if (!isTwoDimensionalParameterBinding(binding)) {
        throw new Error('Expected 2D binding')
      }
      return {
        ...binding,
        keyforms: binding.keyforms.map((keyform) => ({
          ...keyform,
          parts: keyform.parts.map((part) => ({
            ...part,
            glue: [
              {
                id: 'glue-1',
                strength: (keyform.values[0] + 30) / 60,
                weight: (keyform.values[1]! + 30) / 60,
              },
            ],
          })),
        })),
      }
    }),
  }
}

test('should interpolate both Glue controls across the existing two-dimensional grid', () => {
  expect(
    composeParameterGlue({
      document: createDocument(),
      parameterValues: {'angle-x': 15, 'angle-y': -15},
    })[0],
  ).toMatchObject({strength: 0.75, weight: 0.25})
})
test('should preserve static Glue in old documents and clamp combined deltas', () => {
  const document = createDocument()
  expect(composeParameterGlue({document: {...document, parameterBindings: []}})).toEqual(
    document.glue,
  )
  expect(
    composeParameterGlue({
      document: {
        ...document,
        parameterBindings: [...document.parameterBindings, ...document.parameterBindings],
      },
      parameterValues: {'angle-x': -30, 'angle-y': 30},
    })[0],
  ).toMatchObject({strength: 0, weight: 1})
})
test('should apply parameter influence to Glue deltas', () => {
  const document = createDocument()
  const bindings = document.parameterBindings.map((binding) => ({
    ...binding,
    influences: [
      {
        parameterId: 'angle-y',
        points: [
          {value: -30, weight: 0.5},
          {value: 30, weight: 0.5},
        ],
      },
    ],
  }))
  expect(
    composeParameterGlue({
      document: {...document, parameterBindings: bindings},
      parameterValues: {'angle-x': -30, 'angle-y': 0},
    })[0],
  ).toMatchObject({strength: 0.5})
})

test('should interpolate one-dimensional Glue samples and use rest values for missing samples', () => {
  const source = createDocument()
  const part = source.parts.find((part) => part.id === 'mesh-preview')!
  const document = {
    ...source,
    parameterBindings: [
      {
        id: 'glue-x',
        keyforms: [
          {
            parts: [
              {
                glue: [{id: 'glue-1', strength: 0, weight: 0}],
                partId: part.id,
                vertices: part.mesh.vertices,
              },
            ],
            values: [-30] as const,
          },
          {parts: [{partId: part.id, vertices: part.mesh.vertices}], values: [30] as const},
        ],
        parameterIds: ['angle-x'] as const,
        targetPartIds: [part.id],
      },
    ],
  }
  expect(composeParameterGlue({document, parameterValues: {'angle-x': 0}})[0]).toMatchObject({
    strength: 0.5,
    weight: 0.25,
  })
  expect(composeParameterGlue({document, parameterValues: {'angle-x': -100}})[0]).toMatchObject({
    strength: 0,
    weight: 0,
  })
})
