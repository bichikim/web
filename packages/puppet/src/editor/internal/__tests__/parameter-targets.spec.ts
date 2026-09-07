import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {getParameterSelectionNodeIds} from '../parameter-targets'
import {createDeformer, getSceneNode} from '../scene-graph'

describe('getParameterSelectionNodeIds', () => {
  test('should return directly selected parts and deformers without inheriting group children', () => {
    const document = createDemoDocument()
    const deformed = createDeformer(document, ['shape-circle'])!
    const deformer = getSceneNode(deformed, 'deformer')!

    expect(
      getParameterSelectionNodeIds({
        document,
        selection: {activeNodeId: 'shapes', nodeIds: ['shapes']},
      }),
    ).toEqual([])
    expect(
      getParameterSelectionNodeIds({
        document: deformed,
        selection: {activeNodeId: deformer.id, nodeIds: [deformer.id]},
      }),
    ).toEqual([deformer.id])
    expect(
      getParameterSelectionNodeIds({
        document,
        selection: {
          activeNodeId: 'shape-circle',
          nodeIds: ['shapes', 'shape-circle', 'shape-diamond'],
        },
      }),
    ).toEqual(['shape-circle', 'shape-diamond'])
  })
})
