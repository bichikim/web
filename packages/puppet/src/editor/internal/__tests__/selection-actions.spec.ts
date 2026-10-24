import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {createDeformer, createSceneGroup, setSceneNodeState} from '../scene-graph'
import {
  createSceneSelection,
  getSceneSelectionActions,
  getSelectedPartId,
} from '../selection-actions'

describe('getSceneSelectionActions', () => {
  test('should create a selection and resolve its directly selected part', () => {
    const document = createDemoDocument()

    expect(createSceneSelection(null)).toEqual({activeNodeId: null, nodeIds: []})
    expect(createSceneSelection('mesh-preview')).toEqual({
      activeNodeId: 'mesh-preview',
      nodeIds: ['mesh-preview'],
    })
    expect(getSelectedPartId(document, createSceneSelection('mesh-preview'))).toBe('mesh-preview')
    expect(getSelectedPartId(document, createSceneSelection('shapes'))).toBeNull()
  })

  test('should expose only actions supported by every selected node', () => {
    const document = createDemoDocument()

    expect(
      getSceneSelectionActions(document, {
        activeNodeId: 'shape-circle',
        nodeIds: ['shape-circle', 'shape-diamond'],
      }),
    ).toMatchObject({autoMeshPartIds: ['shape-circle', 'shape-diamond'], containerIds: []})
    expect(
      getSceneSelectionActions(document, {
        activeNodeId: 'shape-circle',
        nodeIds: ['shapes', 'shape-circle'],
      }),
    ).toMatchObject({autoMeshPartIds: [], containerIds: []})
  })

  test('should hide an action when any selected node is unavailable', () => {
    const document = setSceneNodeState({
      document: createDemoDocument(),
      locked: true,
      nodeId: 'shape-diamond',
    })!

    expect(
      getSceneSelectionActions(document, {
        activeNodeId: 'shape-diamond',
        nodeIds: ['shape-circle', 'shape-diamond'],
      }).autoMeshPartIds,
    ).toEqual([])
  })

  test('should expose container actions and single-selection details independently', () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!

    expect(
      getSceneSelectionActions(document, {
        activeNodeId: 'shapes',
        nodeIds: [document.scene!.roots[0]!.id, 'shapes'],
      }).containerConversion,
    ).toBeUndefined()
    expect(
      getSceneSelectionActions(document, {activeNodeId: 'shapes', nodeIds: ['shapes']}),
    ).toMatchObject({containerConversion: {nodeIds: ['shapes'], targetKind: 'deformer'}})
    expect(
      getSceneSelectionActions(document, {
        activeNodeId: document.scene!.roots[0]!.id,
        nodeIds: [document.scene!.roots[0]!.id],
      }),
    ).toMatchObject({
      containerConversion: {nodeIds: [document.scene!.roots[0]!.id], targetKind: 'group'},
    })
    expect(
      getSceneSelectionActions(document, {
        activeNodeId: 'shape-circle',
        nodeIds: ['shape-circle', 'shape-diamond'],
      }).singleNodeId,
    ).toBeUndefined()
  })

  test('should expose one conversion for multiple groups and hide it when one is locked', () => {
    const grouped = createSceneGroup(createDemoDocument(), [])!
    const selection = {activeNodeId: 'group', nodeIds: ['shapes', 'group']}

    expect(getSceneSelectionActions(grouped, selection).containerConversion).toEqual({
      nodeIds: ['shapes', 'group'],
      targetKind: 'deformer',
    })

    const locked = setSceneNodeState({document: grouped, locked: true, nodeId: 'group'})!
    expect(getSceneSelectionActions(locked, selection).containerConversion).toBeUndefined()
    expect(
      getSceneSelectionActions(grouped, {
        activeNodeId: 'shapes',
        nodeIds: ['shapes', 'missing'],
      }).containerConversion,
    ).toBeUndefined()
  })
})
