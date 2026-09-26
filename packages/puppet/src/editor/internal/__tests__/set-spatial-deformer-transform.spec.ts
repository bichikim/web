import {expect, test} from 'vitest'

import {composeParameterScene} from '../../../deformation/scene'
import {createDemoDocument, getDocumentScene} from '../../../player'
import {convertSceneContainers} from '../container-conversion'
import {addParameter} from '../parameter-keyforms'
import {setSpatialDeformerTransform} from '../set-spatial-deformer-transform'

test('should preserve other parameter rotations when editing one 3D keyform', () => {
  const source = convertSceneContainers({
    document: {...createDemoDocument(), parameterBindings: [], parameters: []},
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const first = addParameter({document: source, nodeIds: ['shapes']})!
  const second = addParameter({document: first.document, nodeIds: ['shapes']})!
  const rest = getDocumentScene(second.document).roots.find((node) => node.id === 'shapes')
  if (rest?.kind !== 'deformer') {
    throw new Error('Expected a 3D deformer')
  }
  const posed = setSpatialDeformerTransform({
    activeBindingId: second.binding.id,
    activeKeyformValues: [0],
    document: second.document,
    editMode: 'parameter',
    nodeId: rest.id,
    previewDeformer: rest,
    property: 'spatialRotation',
    targetNodeIds: [rest.id],
    value: [0, 20, 0],
  })!
  const preview = composeParameterScene(posed).roots.find((node) => node.id === rest.id)
  if (preview?.kind !== 'deformer') {
    throw new Error('Expected the 3D preview')
  }
  const edited = setSpatialDeformerTransform({
    activeBindingId: first.binding.id,
    activeKeyformValues: [0],
    document: posed,
    editMode: 'parameter',
    nodeId: rest.id,
    previewDeformer: preview,
    property: 'spatialRotation',
    targetNodeIds: [rest.id],
    value: [0, 25, 0],
  })!

  expect(edited.parameterBindings?.[0]?.keyforms[0]?.deformers?.[0]?.spatialRotation).toEqual([
    0, 5, 0,
  ])
  expect(edited.parameterBindings?.[1]).toEqual(posed.parameterBindings?.[1])
  expect(getDocumentScene(edited)).toEqual(getDocumentScene(posed))
  expect(composeParameterScene(edited).roots.find((node) => node.id === rest.id)).toMatchObject({
    spatialRotation: [0, 25, 0],
  })
})

test('should store translation and scale in the active 3D parameter keyform', () => {
  const source = convertSceneContainers({
    document: {...createDemoDocument(), parameterBindings: [], parameters: []},
    nodeIds: ['shapes'],
    targetKind: 'spatial',
  })!
  const added = addParameter({document: source, nodeIds: ['shapes']})!
  const translated = setSpatialDeformerTransform({
    activeBindingId: added.binding.id,
    activeKeyformValues: [0],
    document: added.document,
    editMode: 'parameter',
    nodeId: 'shapes',
    property: 'spatialTranslation',
    targetNodeIds: ['shapes'],
    value: [10, -5, 2],
  })!
  const scaled = setSpatialDeformerTransform({
    activeBindingId: added.binding.id,
    activeKeyformValues: [0],
    document: translated,
    editMode: 'parameter',
    nodeId: 'shapes',
    property: 'spatialScale',
    targetNodeIds: ['shapes'],
    value: [2, 1.5, 1],
  })!

  expect(scaled.parameterBindings?.[0]?.keyforms[0]?.deformers?.[0]).toMatchObject({
    spatialScale: [2, 1.5, 1],
    spatialTranslation: [10, -5, 2],
  })
  expect(composeParameterScene(scaled).roots.find((node) => node.id === 'shapes')).toMatchObject({
    spatialScale: [2, 1.5, 1],
    spatialTranslation: [10, -5, 2],
  })
  expect(
    setSpatialDeformerTransform({
      document: scaled,
      nodeId: 'shapes',
      property: 'spatialScale',
      value: [0, 1, 1],
    }),
  ).toBeUndefined()
})
