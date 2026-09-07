import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type PuppetDocument,
  type PuppetParameterBinding1D,
  serializeDocument,
} from '../../player'
import {
  composeParameterVertices,
  getDefaultParameterValueMap,
  getParameterBindingValues,
} from '../composition'

const createComposedDocument = () => {
  const document = createDemoDocument()
  const part = document.parts[0]!
  const additiveBinding: PuppetParameterBinding1D = {
    id: 'smile',
    keyforms: [
      {parts: [{partId: part.id, vertices: part.mesh.vertices}], values: [0]},
      {
        parts: [
          {
            partId: part.id,
            vertices: part.mesh.vertices.map((coordinate, index) =>
              index === part.mesh.vertices.length - 2 ? coordinate + 10 : coordinate,
            ),
          },
        ],
        values: [10],
      },
    ],
    parameterIds: ['smile'],
    targetPartIds: [part.id],
  }

  return {
    ...document,
    parameterBindings: [...(document.parameterBindings ?? []), additiveBinding],
    parameters: [
      ...(document.parameters ?? []),
      {defaultValue: 0, id: 'smile', maximum: 10, minimum: 0, name: 'Smile'},
    ],
  } satisfies PuppetDocument
}

describe('parameter composition', () => {
  test('should add rest-relative deformation from every binding targeting a part', () => {
    const document = createComposedDocument()
    const part = document.parts[0]!

    expect(
      composeParameterVertices({
        document,
        parameterValues: {'angle-x': 15, 'angle-y': 15, smile: 10},
        partId: part.id,
        restVertices: part.mesh.vertices,
      }).slice(-2),
    ).toEqual([362, 272])
    expect(part.mesh.vertices.slice(-2)).toEqual([320, 240])
  })

  test('should use defaults and clamp supplied parameter values', () => {
    const document = createComposedDocument()
    const binding = document.parameterBindings![0]!

    expect(getDefaultParameterValueMap(document)).toEqual({'angle-x': 0, 'angle-y': 0, smile: 0})
    expect(
      getParameterBindingValues({
        binding,
        document,
        parameterValues: {'angle-x': 100, 'angle-y': Number.NaN},
      }),
    ).toEqual([30, 0])
  })

  test('should retain the rest vertex reference when no binding targets the part', () => {
    const document = createComposedDocument()
    const restVertices = document.parts[1]!.mesh.vertices

    expect(
      composeParameterVertices({
        document,
        parameterValues: {'angle-x': 15, 'angle-y': 15, smile: 10},
        partId: document.parts[1]!.id,
        restVertices,
      }),
    ).toBe(restVertices)
  })
})

test('should attenuate only the selected binding delta using another raw parameter', () => {
  const initial = createComposedDocument()
  const document: PuppetDocument = {
    ...initial,
    parameterBindings: initial.parameterBindings.map((binding) =>
      binding.id === 'smile'
        ? {
            ...binding,
            influences: [
              {
                parameterId: 'angle-y',
                points: [
                  {value: 0, weight: 1},
                  {value: 30, weight: 0},
                ],
              },
            ],
          }
        : binding,
    ),
  }
  const part = document.parts[0]!
  expect(
    composeParameterVertices({
      document,
      parameterValues: {'angle-x': 15, 'angle-y': 15, smile: 10},
      partId: part.id,
      restVertices: part.mesh.vertices,
    }).slice(-2),
  ).toEqual([357, 272])
})

test('should combine five independent inputs with authored suppression through a document round trip', () => {
  const base = createDemoDocument()
  const part = base.parts[0]!
  const ids = ['a', 'i', 'u', 'e', 'o']
  const document: PuppetDocument = {
    ...base,
    motions: [],
    parameterBindings: ids.map((id, index) => ({
      id,
      parameterIds: [id],
      targetPartIds: [part.id],
      influences: ids.slice(index + 1).map((parameterId) => ({
        parameterId,
        points: [
          {value: 0, weight: 1},
          {value: 1, weight: 0},
        ],
      })),
      keyforms: [
        {values: [0], parts: [{partId: part.id, vertices: part.mesh.vertices}]},
        {
          values: [1],
          parts: [
            {
              partId: part.id,
              vertices: part.mesh.vertices.map((value, coordinate) =>
                coordinate === part.mesh.vertices.length - 2 ? value + (index + 1) * 10 : value,
              ),
            },
          ],
        },
      ],
    })),
    parameters: ids.map((id) => ({id, name: id, minimum: 0, maximum: 1, defaultValue: 0})),
  }
  const parsed = parseDocument(serializeDocument(document))
  if (!parsed.ok) {
    throw new Error('Expected a valid influence document')
  }
  const sample = (parameterValues: Record<string, number>) =>
    composeParameterVertices({
      document: parsed.document,
      parameterValues,
      partId: part.id,
      restVertices: part.mesh.vertices,
    }).at(-2)
  expect(sample({a: 1})).toBe(330)
  expect(sample({a: 0.5, i: 0.5})).toBe(332.5)
  expect(sample({a: 1, i: 0.5, u: 0.75})).toBe(347.5)
  expect(sample({a: 1, i: 1, e: 1, u: 1, o: 1})).toBe(370)
  expect(sample({a: 0})).toBe(320)
  expect(sample({a: 0.5, i: 0.5})).toBe(332.5)
})
