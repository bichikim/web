import {expect, test, vi} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../player/document'
import {createDeformerSampler} from '../create-deformer-sampler'
import {composeParameterDeformer} from '../scene'
const node: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
  coordinateSpace: 'parent',
  id: 'warp',
  interpolation: 'triangles',
  kind: 'deformer',
  locked: false,
  name: 'Warp',
  rows: 1,
  visible: true,
}
const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'position',
      influences: [
        {
          parameterId: 'weight',
          points: [
            {value: 0, weight: 0},
            {value: 1, weight: 1},
          ],
        },
      ],
      interpolation: 'grid',
      keyforms: [0, 1].map((value) => ({
        deformers: [
          {
            controlPoints: node.controlPoints.map((x) => x + value),
            kind: 'deformer',
            nodeId: 'warp',
          },
        ],
        parts: [],
        values: [value],
      })),
      parameterIds: ['p'],
      targetDeformerIds: ['warp'],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'},
    {defaultValue: 1, id: 'weight', maximum: 1, minimum: 0, name: 'Weight'},
  ],
  parts: [],
  scene: {roots: [node]},
  version: 1,
  viewport: {height: 1, width: 1},
}
test('should sample native control coordinates without constructing a frame coordinate array', () => {
  const sampler = createDeformerSampler(document, node)
  for (const values of [
    {p: 0.25, weight: 1},
    {p: 0.75, weight: 0.5},
    {p: 0.75, weight: 0},
    {p: 0.25, weight: 1},
  ]) {
    sampler.update(values)
    expect(node.controlPoints.map((_, index) => sampler.sample(index))).toEqual(
      composeParameterDeformer(document, node, values).controlPoints,
    )
  }
})
test('should report only relevant input changes including influences and reused input records', () => {
  const sampler = createDeformerSampler(document, node)
  const values = {p: 0.25, unrelated: 0, weight: 1}
  expect(sampler.update(values)).toBe(true)
  expect(sampler.update({...values, unrelated: 1})).toBe(false)
  values.weight = 0.5
  expect(sampler.update(values)).toBe(true)
  expect(sampler.sample(0)).toBe(0.125)
})
test('should retain each binding channel when another binding or only an influence changes', () => {
  const read = vi.fn((value: number) => value)
  const secondary = {
    id: 'secondary',
    interpolation: 'grid' as const,
    keyforms: [0, 1].map((value) => {
      const coordinates = node.controlPoints.map((coordinate) => coordinate + value * 10)
      Object.defineProperty(coordinates, '0', {get: () => read(value * 10)})
      return {
        deformers: [{controlPoints: coordinates, kind: 'deformer' as const, nodeId: 'warp'}],
        parts: [],
        values: [value] as const,
      }
    }),
    parameterIds: ['q'] as const,
    targetDeformerIds: ['warp'],
  }
  const source = {
    ...document,
    parameterBindings: [...document.parameterBindings!, secondary],
    parameters: [
      ...document.parameters!,
      {defaultValue: 0, id: 'q', maximum: 1, minimum: 0, name: 'Second'},
    ],
  }
  const sampler = createDeformerSampler(source, node)
  sampler.update({p: 0.2, q: 0.4, weight: 1})
  expect(sampler.sample(0)).toBeCloseTo(4.2)
  const initialReads = read.mock.calls.length
  expect(initialReads).toBeGreaterThan(0)
  expect(read).toHaveBeenCalledTimes(initialReads)
  sampler.update({p: 0.7, q: 0.4, weight: 1})
  expect(sampler.sample(0)).toBeCloseTo(4.7)
  expect(read).toHaveBeenCalledTimes(initialReads)
  sampler.update({p: 0.7, q: 0.4, weight: 0.5})
  expect(sampler.sample(0)).toBeCloseTo(4.35)
  expect(read).toHaveBeenCalledTimes(initialReads)
  sampler.update({p: 0.7, q: 0.6, weight: 0.5})
  expect(sampler.sample(0)).toBeCloseTo(6.35)
  expect(read).toHaveBeenCalledTimes(initialReads * 2)
})
test('should preserve the canonical sampler for non-grid binding policies', () => {
  const source = {
    ...document,
    parameterBindings: document.parameterBindings!.map((binding) => ({
      ...binding,
      interpolation: undefined,
    })),
  }
  const sampler = createDeformerSampler(source, node)
  sampler.update({p: 0.3})
  expect(node.controlPoints.map((_, index) => sampler.sample(index))).toEqual(
    composeParameterDeformer(source, node, {p: 0.3}).controlPoints,
  )
})

test.each([0, 1])(
  'should retain scalar axis %i when sampling both axes across input changes',
  (axis) => {
    const output = {x: 0, y: 0}
    const sampler = createDeformerSampler(document, node)
    for (const values of [
      {p: 0.25, weight: 1},
      {p: 0.75, weight: 0.5},
      {p: 0.25, weight: 1},
    ]) {
      sampler.update(values)
      const expected = composeParameterDeformer(document, node, values).controlPoints
      expect(sampler.sample(axis)).toBe(expected[axis])
      for (let point = 0; point < node.controlPoints.length / 2; point += 1) {
        sampler.samplePoint(point, output)
        expect(output).toEqual({x: expected[point * 2], y: expected[point * 2 + 1]})
        expect(sampler.sample(point * 2)).toBe(output.x)
        expect(sampler.sample(point * 2 + 1)).toBe(output.y)
      }
    }
  },
)
