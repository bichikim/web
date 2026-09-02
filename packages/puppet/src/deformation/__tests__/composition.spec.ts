import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetDocument, type PuppetParameterBinding1D} from '../../player'
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
