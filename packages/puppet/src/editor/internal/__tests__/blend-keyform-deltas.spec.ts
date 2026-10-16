import {expect, test} from 'vitest'
import type {PuppetParameterKeyform} from '../../../player'
import {blendKeyformDeltas} from '../blend-keyform-deltas'

const base: PuppetParameterKeyform = {
  deformers: [
    {
      controlPoints: [0, 0],
      kind: 'deformer',
      nodeId: 'grid',
      rotationOrigin: {x: 0, y: 0},
      spatialScale: [1, 1, 1],
    },
  ],
  parts: [
    {
      glue: [{id: 'join', strength: 0.4, weight: 0.4}],
      partId: 'part',
      properties: {multiplyColor: [0.5, 0.5, 0.5], opacity: 0.5},
      vertices: [0, 0],
    },
  ],
  values: [0],
}

test('should compose geometry and constrain colors and connection weights', () => {
  const first: PuppetParameterKeyform = {
    ...base,
    deformers: [
      {
        ...base.deformers![0]!,
        controlPoints: [10, 0],
        rotationOrigin: {x: 10, y: 0},
        spatialScale: [2, 1, 1],
      },
    ],
    parts: [
      {
        ...base.parts[0]!,
        glue: [{id: 'join', strength: 0.8, weight: 0.1}],
        properties: {multiplyColor: [0.9, 0.2, 0.6], opacity: 0.9},
        vertices: [10, 0],
      },
    ],
  }
  const second: PuppetParameterKeyform = {
    ...base,
    deformers: [
      {
        ...base.deformers![0]!,
        controlPoints: [0, 20],
        rotationOrigin: {x: 0, y: 20},
        spatialScale: [1, 2, 1],
      },
    ],
    parts: [
      {
        ...base.parts[0]!,
        glue: [{id: 'join', strength: 0.8, weight: 0.1}],
        properties: {multiplyColor: [0.9, 0.2, 0.6], opacity: 0.9},
        vertices: [0, 20],
      },
    ],
  }
  expect(blendKeyformDeltas(first, second, base)).toEqual({
    deformers: [
      {
        controlPoints: [10, 20],
        curveHandles: undefined,
        kind: 'deformer',
        nodeId: 'grid',
        rotationOrigin: {x: 10, y: 20},
        spatialMeshPosition: undefined,
        spatialOrigin: undefined,
        spatialRotation: undefined,
        spatialScale: [2, 2, 1],
        spatialTranslation: undefined,
      },
    ],
    parts: [
      {
        glue: [{id: 'join', strength: 1, weight: 0}],
        partId: 'part',
        properties: {multiplyColor: [1, 0, 0.7], opacity: 1, screenColor: undefined},
        vertices: [10, 20],
      },
    ],
  })
  expect(base.parts[0]!.vertices).toEqual([0, 0])
})

test('should compose deformer opacity, colors and rotation scales, keeping scales positive', () => {
  const rotation = (rotationScale: number, opacity: number): PuppetParameterKeyform => ({
    deformers: [
      {
        controlPoints: [0, 0],
        kind: 'deformer',
        nodeId: 'rot',
        properties: {opacity},
        rotationScale,
      },
    ],
    parts: [],
    values: [0],
  })
  const [blended] = blendKeyformDeltas(
    rotation(2, 0.8),
    rotation(0.25, 0.4),
    rotation(1, 0.5),
  ).deformers!
  expect(blended?.rotationScale).toBeCloseTo(1.25)
  expect(blended?.properties?.opacity).toBeCloseTo(0.7)
  const [shrunk] = blendKeyformDeltas(
    rotation(0.2, 0.5),
    rotation(0.2, 0.5),
    rotation(1, 0.5),
  ).deformers!
  expect(shrunk?.rotationScale).toBe(0.01)
})
