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
