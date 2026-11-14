import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type PuppetDocument,
  type PuppetParameterBinding1D,
  type PuppetParameterBinding3D,
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

  test('should resolve actual parameter axes independently of an array serialization hook', () => {
    const document = createComposedDocument()
    const original = document.parameterBindings.at(-1)!
    const parameterIds = Object.assign(['angle-x'] as const, {toJSON: () => ['smile']})
    const subject: PuppetParameterBinding1D = {id: 'subject', keyforms: [], parameterIds}
    const parameterValues = {'angle-x': 15, smile: 3}
    expect(getParameterBindingValues({binding: original, document, parameterValues})).toEqual([3])
    expect(getParameterBindingValues({binding: subject, document, parameterValues})).toEqual([15])
  })

  test('should retain earlier samples while equivalent bindings read changing raw inputs', () => {
    const document = createComposedDocument()
    const binding = document.parameterBindings[0]!
    const equivalent = {...binding, id: 'equivalent', keyforms: []}
    const parameterValues: Record<string, number> = {'angle-x': 0.25, 'angle-y': 0.5}
    const first = getParameterBindingValues({binding, document, parameterValues})
    parameterValues['angle-x'] = 100
    parameterValues['angle-y'] = Number.NaN
    expect(getParameterBindingValues({binding: equivalent, document, parameterValues})).toEqual([
      30, 0,
    ])
    parameterValues['angle-x'] = -0
    delete parameterValues['angle-y']
    const signed = getParameterBindingValues({binding, document, parameterValues})
    expect(signed).toEqual([-0, 0])
    expect(getParameterBindingValues({binding: equivalent, document})).toEqual([0, 0])
    expect(first).toEqual([0.25, 0.5])
    expect(signed).toEqual([-0, 0])
  })

  test('should retain axis order, wrapping, unknown parameters and independent document defaults', () => {
    const document: PuppetDocument = {
      ...createComposedDocument(),
      parameters: [
        {defaultValue: 0.25, id: 'p', maximum: 1, minimum: 0, name: 'P', repeat: true},
        {defaultValue: 0, id: 'q', maximum: 2, minimum: 0, name: 'Q'},
      ],
    }
    const binding: PuppetParameterBinding3D = {
      id: 'three',
      keyforms: [],
      parameterIds: ['p', 'q', 'missing'],
    }
    const reversed: PuppetParameterBinding3D = {
      ...binding,
      id: 'reversed',
      parameterIds: ['q', 'p', 'missing'],
    }
    const parameterValues = {missing: 100, p: 1.25, q: 1.8}
    expect(getParameterBindingValues({binding, document, parameterValues})).toEqual([0.25, 1.8, 0])
    expect(getParameterBindingValues({binding: reversed, document, parameterValues})).toEqual([
      1.8, 0.25, 0,
    ])
    const updated = {
      ...document,
      parameters: document.parameters!.map((parameter) => ({...parameter, defaultValue: 0.75})),
    }
    expect(getParameterBindingValues({binding, document: updated})).toEqual([0.75, 0.75, 0])
    expect(getParameterBindingValues({binding, document})).toEqual([0.25, 0, 0])
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

  test('should apply a binding once when its explicit target list repeats a part', () => {
    const initial = createComposedDocument()
    const part = initial.parts[0]!
    const smile = initial.parameterBindings.at(-1)!
    const document: PuppetDocument = {
      ...initial,
      parameterBindings: [{...smile, targetPartIds: [part.id, part.id]}],
    }

    expect(
      composeParameterVertices({
        document,
        parameterValues: {smile: 10},
        partId: part.id,
        restVertices: part.mesh.vertices,
      }).at(-2),
    ).toBe(330)
  })

  test('should find parts from keyforms when explicit targets are absent', () => {
    const initial = createComposedDocument()
    const part = initial.parts[0]!
    const {targetPartIds: _targetPartIds, ...smile} = initial.parameterBindings.at(-1)!
    const document: PuppetDocument = {...initial, parameterBindings: [smile]}

    expect(
      composeParameterVertices({
        document,
        parameterValues: {smile: 10},
        partId: part.id,
        restVertices: part.mesh.vertices,
      }).at(-2),
    ).toBe(330)
  })

  test('should let an explicit empty target list override keyform parts', () => {
    const initial = createComposedDocument()
    const part = initial.parts[0]!
    const smile = initial.parameterBindings.at(-1)!
    const document: PuppetDocument = {
      ...initial,
      parameterBindings: [{...smile, targetPartIds: []}],
    }

    expect(
      composeParameterVertices({
        document,
        parameterValues: {smile: 10},
        partId: part.id,
        restVertices: part.mesh.vertices,
      }),
    ).toBe(part.mesh.vertices)
  })

  test('should use the latest binding list after an immutable document update', () => {
    const initial = createComposedDocument()
    const part = initial.parts[0]!
    const smile = initial.parameterBindings.at(-1)!
    const document: PuppetDocument = {...initial, parameterBindings: [smile]}
    const options = {
      document,
      parameterValues: {smile: 10},
      partId: part.id,
      restVertices: part.mesh.vertices,
    }

    expect(composeParameterVertices(options).at(-2)).toBe(330)
    expect(
      composeParameterVertices({
        ...options,
        document: {...document, parameterBindings: []},
      }),
    ).toBe(part.mesh.vertices)
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
      influences: ids.slice(index + 1).map((parameterId) => ({
        parameterId,
        points: [
          {value: 0, weight: 1},
          {value: 1, weight: 0},
        ],
      })),
      keyforms: [
        {parts: [{partId: part.id, vertices: part.mesh.vertices}], values: [0]},
        {
          parts: [
            {
              partId: part.id,
              vertices: part.mesh.vertices.map((value, coordinate) =>
                coordinate === part.mesh.vertices.length - 2 ? value + (index + 1) * 10 : value,
              ),
            },
          ],
          values: [1],
        },
      ],
      parameterIds: [id],
      targetPartIds: [part.id],
    })),
    parameters: ids.map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: id})),
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
  expect(sample({a: 1, e: 1, i: 1, o: 1, u: 1})).toBe(370)
  expect(sample({a: 0})).toBe(320)
  expect(sample({a: 0.5, i: 0.5})).toBe(332.5)
})

test('should read replaced parameter definitions while retaining binding identities', () => {
  const document = createComposedDocument()
  const binding = document.parameterBindings[0]!
  expect(getParameterBindingValues({binding, document})).toEqual([0, 0])
  const updated = {
    ...document,
    parameters: document.parameters.map((parameter) => ({...parameter, defaultValue: 15})),
  }
  expect(getParameterBindingValues({binding, document: updated})).toEqual([15, 15])
  expect(getParameterBindingValues({binding, document})).toEqual([0, 0])
})

test('should leave vertices untouched for bindings that key only display properties', () => {
  const source = createComposedDocument()
  const rest = [0, 0, 10, 0, 0, 10]
  const document = {
    ...source,
    parameterBindings: [
      {
        id: 'opacity',
        interpolation: 'grid' as const,
        keyforms: [
          {parts: [{partId: 'part', properties: {opacity: 0}, vertices: []}], values: [0] as const},
          {parts: [{partId: 'part', properties: {opacity: 1}, vertices: []}], values: [1] as const},
        ],
        parameterIds: ['x'] as const,
        targetPartIds: ['part'],
      },
    ],
  }
  expect(
    composeParameterVertices({
      document,
      parameterValues: {x: 0.5},
      partId: 'part',
      restVertices: rest,
    }),
  ).toBe(rest)
  expect(rest).toEqual([0, 0, 10, 0, 0, 10])
})

test('should observe changed inputs without changing previously returned vertex snapshots', () => {
  const source = createComposedDocument()
  const part = source.parts[0]!
  const document = {...source, parameterBindings: [source.parameterBindings.at(-1)!]}
  const values = {smile: 5, unrelated: 0}
  const sample = () =>
    composeParameterVertices({
      document,
      parameterValues: values,
      partId: part.id,
      restVertices: part.mesh.vertices,
    })
  const first = sample()
  values.unrelated = 1
  expect(sample()).toEqual(first)
  values.smile = 10
  expect(sample().at(-2)).toBe(330)
  values.smile = 0
  expect(sample().at(-2)).toBe(320)
  expect(first.at(-2)).toBe(325)
  expect(part.mesh.vertices.at(-2)).toBe(320)
})

test('should observe influence changes while a keyed input stays constant', () => {
  const source = createComposedDocument()
  const part = source.parts[0]!
  const document: PuppetDocument = {
    ...source,
    parameterBindings: [
      {
        ...source.parameterBindings.at(-1)!,
        influences: [
          {
            parameterId: 'angle-y',
            points: [
              {value: 0, weight: 1},
              {value: 30, weight: 0},
            ],
          },
        ],
      },
    ],
  }
  const sample = (parameterValues: Record<string, number>) =>
    composeParameterVertices({
      document,
      parameterValues,
      partId: part.id,
      restVertices: part.mesh.vertices,
    })
  const first = sample({smile: 10})
  expect(first.at(-2)).toBe(330)
  expect(sample({'angle-y': 15, smile: 10}).at(-2)).toBe(325)
  expect(sample({'angle-y': 30, smile: 10}).at(-2)).toBe(320)
  expect(sample({smile: 10})).toEqual(first)
  expect(first.at(-2)).toBe(330)
})

test('should use each supplied rest array when keyform coordinates are missing', () => {
  const document: PuppetDocument = {
    ...createDemoDocument(),
    parameterBindings: [
      {
        id: 'sparse',
        interpolation: 'grid',
        keyforms: [{parts: [{partId: 'part', vertices: [10]}], values: [1]}],
        parameterIds: ['p'],
        targetPartIds: ['part'],
      },
    ],
    parameters: [{defaultValue: 1, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  }
  const sample = (restVertices: ReadonlyArray<number>) =>
    composeParameterVertices({document, partId: 'part', restVertices})
  const first = [0, 20]
  const second = [2, 30]
  expect(sample(first)).toEqual([10, 20])
  expect(sample(second)).toEqual([10, 30])
  expect(sample(first)).toEqual([10, 20])
  expect(first).toEqual([0, 20])
  expect(second).toEqual([2, 30])
})

test('should retain binding accumulation order through large-coordinate cancellation', () => {
  const document: PuppetDocument = {
    ...createDemoDocument(),
    parameterBindings: [
      {
        id: 'first',
        interpolation: 'grid',
        keyforms: [{parts: [{partId: 'part', vertices: [0, 10]}], values: [1]}],
        parameterIds: ['p'],
        targetPartIds: ['part'],
      },
      {
        id: 'second',
        influences: [
          {
            parameterId: 'q',
            points: [
              {value: 0, weight: 0.5},
              {value: 1, weight: 0.5},
            ],
          },
        ],
        interpolation: 'grid',
        keyforms: [{parts: [{partId: 'part', vertices: [1e16 + 2, 22]}], values: [1]}],
        parameterIds: ['p'],
        targetPartIds: ['part'],
      },
    ],
    parameters: [
      {defaultValue: 1, id: 'p', maximum: 1, minimum: 0, name: 'P'},
      {defaultValue: 0, id: 'q', maximum: 1, minimum: 0, name: 'Q'},
    ],
  }
  const restVertices = [1e16, 20]
  expect(composeParameterVertices({document, partId: 'part', restVertices})).toEqual([1, 11])
  expect(restVertices).toEqual([1e16, 20])
})
