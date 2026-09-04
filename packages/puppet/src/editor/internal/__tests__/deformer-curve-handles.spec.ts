import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  getDocumentScene,
  parseDocument,
  type PuppetSceneDeformerNode,
} from '../../../player'
import {
  addDeformerCurveHandle,
  createDeformerCurveHandle,
  removeDeformerCurveHandle,
} from '../deformer-curve-handles'
import {addParameter} from '../parameter-keyforms'
import {createDeformer, resizeDeformer} from '../scene-graph'

describe('deformer curve handles', () => {
  test('should create a neutral curve handle for a selected grid point', () => {
    const deformer: PuppetSceneDeformerNode = {
      bounds: {height: 100, width: 100, x: 0, y: 0},
      children: [],
      columns: 1,
      controlPoints: [0, 0, 100, 0, 0, 100, 100, 100],
      id: 'deformer',
      kind: 'deformer',
      locked: false,
      name: 'Deformer',
      rows: 1,
      visible: true,
    }

    expect(createDeformerCurveHandle(deformer, 0)).toEqual({
      horizontal: {x: 100 / 3, y: 0},
      pointIndex: 0,
      vertical: {x: 0, y: 100 / 3},
    })
  })

  test('should add and remove optional curve handles across parameter keyforms', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const addedParameter = addParameter({document: deformerDocument, nodeIds: [deformer.id]})!
    const withHandle = addDeformerCurveHandle(addedParameter.document, deformer.id, 4)!
    const sceneDeformer = getDocumentScene(withHandle).roots[0]
    const keyformDeformer = withHandle.parameterBindings?.[0]?.keyforms[0]?.deformers?.[0]

    expect(sceneDeformer?.kind === 'deformer' ? sceneDeformer.curveHandles : []).toMatchObject([
      {pointIndex: 4},
    ])
    expect(keyformDeformer?.curveHandles).toMatchObject([{pointIndex: 4}])
    expect(parseDocument(JSON.stringify(withHandle)).ok).toBe(true)

    const removed = removeDeformerCurveHandle(withHandle, deformer.id, 4)!
    const removedDeformer = getDocumentScene(removed).roots[0]
    expect(removedDeformer?.kind === 'deformer' ? removedDeformer.curveHandles : undefined).toEqual(
      [],
    )
    expect(removed.parameterBindings?.[0]?.keyforms[0]?.deformers?.[0]?.curveHandles).toEqual([])
  })

  test('should keep curve handles attached when the grid is resampled', () => {
    const deformerDocument = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const withHandle = addDeformerCurveHandle(deformerDocument, deformer.id, 4)!
    const resized = resizeDeformer({
      columns: 4,
      document: withHandle,
      nodeId: deformer.id,
      rows: 4,
    })!
    const resizedDeformer = getDocumentScene(resized).roots[0]

    expect(resizedDeformer?.kind === 'deformer' ? resizedDeformer.curveHandles : []).toMatchObject([
      {pointIndex: 12},
    ])
  })
})
