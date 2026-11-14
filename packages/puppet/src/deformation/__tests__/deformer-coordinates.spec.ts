import {describe, expect, test} from 'vitest'
import {
  getCurveHandleCoordinates,
  getDeformerCoordinates,
  getDeformerKeyforms,
  getDeformerRest,
} from '../deformer-coordinates'
import type {PuppetParameterBinding, PuppetSceneDeformerNode} from '../../player/document'

const radians = (degrees: number) => (degrees * Math.PI) / 180
const segment = (degrees: number) => [0, 0, Math.cos(radians(degrees)), Math.sin(radians(degrees))]
const node = (degrees: number): PuppetSceneDeformerNode => ({
  boneRestPoints: [0, 0, 1, 0],
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: segment(degrees),
  deformerType: 'rotation',
  id: 'bone',
  kind: 'deformer',
  locked: false,
  name: 'Bone',
  rotationReflection: [false, true],
  rotationScale: 2,
  rows: 1,
  visible: true,
})
const binding: PuppetParameterBinding = {
  id: 'angle',
  interpolation: 'grid',
  keyforms: [
    {
      deformers: [
        {
          controlPoints: segment(-170),
          kind: 'deformer',
          nodeId: 'bone',
          rotationReflection: [true, false],
          rotationScale: 0.5,
        },
      ],
      parts: [],
      values: [0],
    },
    {parts: [], values: [1]},
  ],
  parameterIds: ['angle'],
  targetDeformerIds: ['bone'],
}

describe('getDeformerKeyforms', () => {
  test('should prepare rest-aligned rotation channels and preserve missing keyform fallbacks', () => {
    const owner = node(170)
    const prepared = getDeformerKeyforms(binding, owner)
    expect(prepared.coordinates[0]?.[2]).toBeCloseTo(radians(190), 12)
    expect(prepared.coordinates[1]).toBeUndefined()
    expect(prepared.rotationScale).toEqual([[0.5], [2]])
    expect(prepared.rotationReflection).toEqual([
      [1, 0],
      [0, 1],
    ])
    expect(getDeformerKeyforms(binding, owner)).toBe(prepared)
    expect(owner.controlPoints).toEqual(segment(170))
    expect(binding.keyforms[0]?.deformers?.[0]?.controlPoints).toEqual(segment(-170))
  })

  test('should keep replaced bindings and same-id owners independent', () => {
    const owner = node(170)
    const first = getDeformerKeyforms(binding, owner)
    const other = getDeformerKeyforms(binding, node(-170))
    expect(other.coordinates[0]?.[2]).toBeCloseTo(radians(-170), 12)
    expect(other).not.toBe(first)
    const replaced = getDeformerKeyforms({...binding, keyforms: []}, owner)
    expect(replaced.coordinates).toEqual([])
    expect(getDeformerKeyforms(binding, owner)).toBe(first)
  })

  test('should prepare keyed origins and preserve missing curve handles in rest order', () => {
    const first = {horizontal: {x: 1, y: 2}, pointIndex: 3, vertical: {x: 3, y: 4}}
    const second = {horizontal: {x: 5, y: 6}, pointIndex: 0, vertical: {x: 7, y: 8}}
    const keyed = {horizontal: {x: 9, y: 10}, pointIndex: 0, vertical: {x: 11, y: 12}}
    const owner = {
      ...node(0),
      boneRestPoints: undefined,
      controlPoints: [0, 0, 2, 4],
      curveHandles: [first, second],
    }
    const forms: PuppetParameterBinding = {
      ...binding,
      keyforms: [
        {
          deformers: [
            {
              controlPoints: owner.controlPoints,
              curveHandles: [keyed],
              kind: 'deformer',
              nodeId: 'bone',
              rotationOrigin: {x: -3, y: -4},
            },
          ],
          parts: [],
          values: [0],
        },
        {parts: [], values: [1]},
      ],
    }
    const channels = getDeformerKeyforms(forms, owner)
    expect(channels.rest.rotationOrigin).toEqual({x: 1, y: 2})
    expect(channels.rotationOrigin).toEqual([
      [-3, -4],
      [1, 2],
    ])
    expect(channels.rest.curveHandles).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(channels.curveHandles).toEqual([
      [1, 2, 3, 4, 9, 10, 11, 12],
      [1, 2, 3, 4, 5, 6, 7, 8],
    ])
    expect(owner.curveHandles).toEqual([first, second])
  })
})

describe('getDeformerRest', () => {
  test('should reuse immutable rest channels and distinguish replacement nodes', () => {
    const owner = node(0)
    const rest = getDeformerRest(owner)
    expect(getDeformerRest(owner)).toBe(rest)
    expect(rest.rotationOrigin).toEqual({x: 0.5, y: 0})
    expect(rest.curveHandles).toEqual([])
    expect(rest.rotationScale).toEqual([2])
    expect(rest.rotationReflection).toEqual([0, 1])
    const origin = {x: -0, y: 4}
    const replaced = getDeformerRest({...owner, rotationOrigin: origin})
    expect(replaced.rotationOrigin).toBe(origin)
    expect(replaced).not.toBe(rest)
  })
})

describe('getCurveHandleCoordinates', () => {
  test('should ignore keyed handles when the rest shape has none', () => {
    expect(
      getCurveHandleCoordinates(
        [{horizontal: {x: 1, y: 2}, pointIndex: 0, vertical: {x: 3, y: 4}}],
        node(0),
      ),
    ).toEqual([])
  })
})

describe('getDeformerCoordinates', () => {
  test('should preserve explicit multi-turn angles and reuse only immutable rest coordinates', () => {
    const owner = node(0)
    const rest = getDeformerCoordinates(owner, owner.controlPoints)
    expect(getDeformerCoordinates(owner, owner.controlPoints)).toBe(rest)
    expect(getDeformerCoordinates(owner, segment(0), Math.PI * 4)[2]).toBeCloseTo(Math.PI * 4, 12)
    expect(getDeformerCoordinates(owner, segment(90))[2]).toBeCloseTo(Math.PI / 2, 12)
    const grid = {...owner, boneRestPoints: undefined, deformerType: undefined}
    const input = [-0, 0, 1, 1]
    expect(getDeformerCoordinates(grid, input)).toBe(input)
  })
})
