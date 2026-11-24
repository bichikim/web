import {expect, it} from 'vitest'
import {modelTouchParameters} from '../model-touch-parameters'
it('should map parts and parent deformers to 1D, 2D and 3D axes without treating the third axis as rotation', () => {
  const document = {
    parameterBindings: [
      {
        id: 'face',
        keyforms: [{parts: [], values: [0, 0, 0]}],
        parameterIds: ['x', 'y', 'z'],
        targetDeformerIds: ['face-deformer'],
      },
      {
        id: 'arm',
        keyforms: [{parts: [], values: [0]}],
        parameterIds: ['arm'],
        targetPartIds: ['hand'],
      },
    ],
    parameters: ['x', 'y', 'z', 'arm'].map((id) => ({
      defaultValue: 0,
      id,
      maximum: 1,
      minimum: -1,
      name: id,
    })),
    scene: {
      roots: [{children: [{id: 'face-part', kind: 'part'}], id: 'face-deformer', kind: 'deformer'}],
    },
  }
  const parameters = modelTouchParameters(document)
  expect(parameters.map(({id, axis, parts}) => ({axis, id, parts}))).toEqual([
    {axis: 'x', id: 'x', parts: ['face-part']},
    {axis: 'y', id: 'y', parts: ['face-part']},
    {axis: 'z', id: 'z', parts: ['face-part']},
    {axis: 'x', id: 'arm', parts: ['hand']},
  ])
})
it('should identify actual rotation bindings separately from ordinary hand XY controls', () => {
  const parameters = modelTouchParameters({
    parameterBindings: [
      {keyforms: [{parts: []}], parameterIds: ['shoulder'], targetDeformerIds: ['rotate']},
      {keyforms: [{parts: []}], parameterIds: ['handX'], targetPartIds: ['hand']},
    ],
    parameters: ['shoulder', 'handX'].map((id) => ({
      defaultValue: 0,
      id,
      maximum: 30,
      minimum: -30,
      name: id,
    })),
    scene: {
      roots: [
        {
          children: [{id: 'hand', kind: 'part'}],
          deformerType: 'rotation',
          id: 'rotate',
          kind: 'deformer',
        },
      ],
    },
  })
  expect(parameters.find((parameter) => parameter.id === 'shoulder')?.joint).toBe(true)
  expect(parameters.find((parameter) => parameter.id === 'handX')?.joint).toBeUndefined()
})
it('should include skinned parts attached to bones outside their scene branch', () => {
  const parameters = modelTouchParameters({
    parameterBindings: [
      {keyforms: [{parts: []}], parameterIds: ['rotate'], targetDeformerIds: ['bone']},
    ],
    parameters: [{defaultValue: 0, id: 'rotate', maximum: 1, minimum: -1, name: 'Rotate'}],
    scene: {
      roots: [
        {children: [], deformerType: 'rotation', id: 'bone', kind: 'deformer'},
        {id: 'tail', kind: 'part', skinning: {influences: [{nodeId: 'bone'}]}},
      ],
    },
  })
  expect(parameters[0]).toMatchObject({id: 'rotate', joint: true, parts: ['tail']})
})
