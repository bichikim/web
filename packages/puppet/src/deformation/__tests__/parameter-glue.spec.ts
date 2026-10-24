import {isTwoDimensionalParameterBinding} from '../parameter'
import {expect, test} from 'vitest'
import {createDemoDocument, type PuppetParameterBinding1D} from '../../player'
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

const demo = createDemoDocument()
const glue = {
  first: {partId: demo.parts[0]!.id, vertexIndex: 0},
  id: 'seam',
  second: {partId: demo.parts[1]!.id, vertexIndex: 0},
  strength: 0,
  weight: 0.5,
}
const parameter = {defaultValue: 0, id: 'join', maximum: 1, minimum: 0, name: 'Join'}
const binding: PuppetParameterBinding1D = {
  id: 'join',
  interpolation: 'grid',
  keyforms: [0, 1].map((value) => ({
    glue: [{id: 'seam', strength: value, weight: 0.5}],
    parts: [],
    values: [value],
  })),
  parameterIds: ['join'],
  targetGlueIds: ['seam'],
}

test('should match legacy Glue animation without a part target or empty mesh entry', () => {
  const direct = {...demo, glue: [glue], parameterBindings: [binding], parameters: [parameter]}
  const legacy: PuppetParameterBinding1D = {
    ...binding,
    keyforms: binding.keyforms.map((form) => ({
      parts: [{glue: form.glue, partId: glue.first.partId, vertices: []}],
      values: form.values,
    })),
    targetGlueIds: undefined,
    targetPartIds: [glue.first.partId],
  }
  for (const value of [0, 0.25, 0.5, 0.99999, 1]) {
    const actual = composeParameterGlue({document: direct, parameterValues: {join: value}})
    expect(actual).toEqual(
      composeParameterGlue({
        document: {...direct, parameterBindings: [legacy]},
        parameterValues: {join: value},
      }),
    )
    expect(actual).toEqual(
      composeParameterGlue({
        document: {...direct, parameterBindings: [{...binding, targetGlueIds: undefined}]},
        parameterValues: {join: value},
      }),
    )
    expect(actual[0]!.strength).toBe(value > 0.9999 ? 1 : value)
  }
})

test('should leave an unlisted Glue connection at its base values', () => {
  const other = {...glue, id: 'other', strength: 0.3}
  const document = {
    ...demo,
    glue: [glue, other],
    parameterBindings: [binding],
    parameters: [parameter],
  }
  expect(composeParameterGlue({document, parameterValues: {join: 1}})[1]).toEqual(other)
})
