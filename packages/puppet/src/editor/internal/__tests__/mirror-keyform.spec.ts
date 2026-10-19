import {expect, test} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {mirrorKeyform} from '../mirror-keyform'

const createSource = (): PuppetDocument => ({
  ...createDemoDocument(),
  parameterBindings: [
    {
      id: 'binding',
      keyforms: [
        {parts: [{partId: 'part', vertices: [0, 0, 100, 0, 0, 100, 100, 100]}], values: [0]},
        {parts: [{partId: 'part', vertices: [10, 0, 120, 0, 10, 100, 120, 100]}], values: [1]},
      ],
      parameterIds: ['x'],
      targetPartIds: ['part'],
    },
  ],
  parameters: [{defaultValue: 0, id: 'x', maximum: 1, minimum: -1, name: 'X'}],
  parts: [
    {
      id: 'part',
      mesh: {
        indices: [0, 1, 2, 1, 3, 2],
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        vertices: [0, 0, 100, 0, 0, 100, 100, 100],
      },
      texture: {height: 100, src: '', width: 100},
    },
  ],
  scene: {roots: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}]},
})

test('should mirror deformation across the specified axis and create the opposite parameter key', () => {
  const source = createSource()
  const result = mirrorKeyform({
    axis: 'x',
    bindingId: 'binding',
    center: 50,
    document: source,
    overwrite: false,
    parameterIndex: 0,
    values: [1],
  })
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  expect(result.values).toEqual([-1])
  expect(
    result.document.parameterBindings![0]!.keyforms.find((keyform) => keyform.values[0] === -1)
      ?.parts[0]?.vertices,
  ).toEqual([-20, 0, 90, 0, -20, 100, 90, 100])
  expect(source.parameterBindings![0]!.keyforms).toHaveLength(2)
})

test('should refuse default forms, invalid reflected values, and existing destinations without overwrite', () => {
  const source = createSource()
  const options = {
    axis: 'x' as const,
    bindingId: 'binding',
    center: 50,
    document: source,
    overwrite: false,
    parameterIndex: 0,
    values: [1] as const,
  }
  expect(mirrorKeyform({...options, values: [0]}).ok).toBe(false)
  const result = mirrorKeyform(options)
  if (!result.ok) {
    throw new Error(result.message)
  }
  expect(mirrorKeyform({...options, document: result.document}).ok).toBe(false)
  expect(mirrorKeyform({...options, document: result.document, overwrite: true}).ok).toBe(true)
  expect(
    mirrorKeyform({
      ...options,
      document: {...source, parameters: [{...source.parameters![0]!, minimum: 0}]},
    }).ok,
  ).toBe(false)
})

test('should refuse locked targets and preserve their geometry', () => {
  const source = createSource()
  const document = {
    ...source,
    scene: {roots: source.scene!.roots.map((node) => ({...node, locked: true}))},
  }
  expect(
    mirrorKeyform({
      axis: 'x',
      bindingId: 'binding',
      center: 50,
      document,
      overwrite: true,
      parameterIndex: 0,
      values: [1],
    }).ok,
  ).toBe(false)
})

test('should reverse rotation and translation while retaining the source scale', () => {
  const original = createSource()
  const node = {
    bounds: {height: 100, width: 100, x: 0, y: 0},
    children: [],
    columns: 1,
    controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
    deformerType: 'rotation' as const,
    id: 'rotation',
    kind: 'deformer' as const,
    locked: false,
    name: 'Rotation',
    rotationOrigin: {x: 0, y: 0},
    rows: 1,
    visible: true,
  }
  const document = {
    ...original,
    parameterBindings: [
      {
        ...original.parameterBindings![0]!,
        keyforms: [
          {
            deformers: [
              {
                controlPoints: node.controlPoints,
                kind: 'deformer' as const,
                nodeId: 'rotation',
                rotationOrigin: {x: 0, y: 0},
              },
            ],
            parts: [],
            values: [0] as const,
          },
          {
            deformers: [
              {
                controlPoints: [10, 20, 10, 220, -190, 20, -190, 220],
                kind: 'deformer' as const,
                nodeId: 'rotation',
                rotationOrigin: {x: 10, y: 20},
              },
            ],
            parts: [],
            values: [1] as const,
          },
        ],
        parameterIds: ['x'] as const,
        targetDeformerIds: ['rotation'],
        targetPartIds: [],
      },
    ],
    scene: {roots: [node]},
  }
  const result = mirrorKeyform({
    axis: 'x',
    bindingId: 'binding',
    center: 50,
    document,
    overwrite: false,
    parameterIndex: 0,
    values: [1],
  })
  if (!result.ok) {
    throw new Error(result.message)
  }
  const mirrored = result.document.parameterBindings![0]!.keyforms.find(
    (entry) => entry.values[0] === -1,
  )!.deformers![0]!
  expect(mirrored.rotationOrigin).toEqual({x: -10, y: 20})
  const expected = [-10, 20, -10, -180, 190, 20, 190, -180]
  mirrored.controlPoints.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!))
})

test('should mirror only the selected parameter axis of a two-dimensional keyform', () => {
  const original = createSource()
  const source = original.parameterBindings![0]!.keyforms[1]!
  const document = {
    ...original,
    parameterBindings: [
      {
        ...original.parameterBindings![0]!,
        keyforms: [
          {...original.parameterBindings![0]!.keyforms[0]!, values: [0, 0] as const},
          {...source, values: [1, 2] as const},
        ],
        parameterIds: ['x', 'y'] as const,
      },
    ],
    parameters: [
      ...original.parameters!,
      {defaultValue: 0, id: 'y', maximum: 2, minimum: -2, name: 'Y'},
    ],
  }
  const result = mirrorKeyform({
    axis: 'y',
    bindingId: 'binding',
    center: 50,
    document,
    overwrite: false,
    parameterIndex: 1,
    values: [1, 2],
  })
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.values).toEqual([1, -2])
  }
})
