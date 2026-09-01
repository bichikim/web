import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {getDocumentScene} from '../../../player/scene'
import {
  createSceneGroup,
  getSceneSelectionPartIds,
  moveSceneNode,
  moveSceneNodeBy,
  moveSceneNodeRelative,
  moveSceneNodeToParent,
  renameSceneGroup,
  setSceneNodeState,
  ungroupSceneNode,
} from '../scene-graph'

const getRootIds = (document: ReturnType<typeof createDemoDocument>) =>
  getDocumentScene(document).roots.map((node) => node.id)

describe('scene graph', () => {
  test('should group selected siblings and preserve their order', () => {
    const document = {...createDemoDocument(), scene: undefined}
    const grouped = createSceneGroup(document, ['mesh-preview', 'shape-diamond'])

    expect(grouped).toBeDefined()
    expect(getDocumentScene(grouped!).roots).toMatchObject([
      {
        children: [{id: 'mesh-preview'}, {id: 'shape-diamond'}],
        id: 'group',
        kind: 'group',
      },
      {id: 'shape-circle'},
    ])
  })

  test('should resolve selected groups and parts to unique descendant part ids', () => {
    const document = createDemoDocument()

    expect(
      getSceneSelectionPartIds(document, {
        activeNodeId: 'shapes',
        nodeIds: ['shapes', 'shape-circle'],
      }),
    ).toEqual(['shape-circle', 'shape-diamond'])
  })

  test('should rename, hide, move, promote and ungroup a group', () => {
    const document = {...createDemoDocument(), scene: undefined}
    const grouped = createSceneGroup(document, ['shape-circle', 'shape-diamond'])!
    const renamed = renameSceneGroup(grouped, 'group', 'Face')!
    const hidden = setSceneNodeState({
      document: renamed,
      nodeId: 'group',
      visible: false,
    })!
    const locked = setSceneNodeState({document: hidden, locked: true, nodeId: 'group'})!
    const moved = moveSceneNodeBy(hidden, 'group', -1)!
    const nested = moveSceneNode({document: moved, nodeId: 'mesh-preview', parentId: 'group'})!
    const promoted = moveSceneNodeToParent(nested, 'mesh-preview')!
    const ungrouped = ungroupSceneNode(promoted, 'group')!

    expect(getDocumentScene(locked).roots[1]).toMatchObject({
      id: 'group',
      locked: true,
      name: 'Face',
      visible: false,
    })
    expect(getRootIds(moved)).toEqual(['group', 'mesh-preview'])
    expect(getRootIds(promoted)).toEqual(['group', 'mesh-preview'])
    expect(getRootIds(ungrouped)).toEqual(['shape-circle', 'shape-diamond', 'mesh-preview'])
  })

  test('should reject moving a group inside its own descendant', () => {
    const document = createDemoDocument()
    const nested = createSceneGroup(document, ['shapes'])!

    expect(moveSceneNode({document: nested, nodeId: 'group', parentId: 'shapes'})).toBeUndefined()
  })

  test('should place nodes before, inside, after, and at the root end', () => {
    const document = createDemoDocument()
    const nested = moveSceneNodeRelative({
      document,
      nodeId: 'mesh-preview',
      position: 'inside',
      targetNodeId: 'shapes',
    })!
    const reordered = moveSceneNodeRelative({
      document: nested,
      nodeId: 'shape-diamond',
      position: 'before',
      targetNodeId: 'shape-circle',
    })!
    const promoted = moveSceneNodeRelative({
      document: reordered,
      nodeId: 'mesh-preview',
      position: 'after',
      targetNodeId: 'shapes',
    })!
    const rootEnd = moveSceneNodeRelative({
      document: promoted,
      nodeId: 'shapes',
      position: 'inside',
      targetNodeId: null,
    })!

    expect(getDocumentScene(reordered).roots[0]).toMatchObject({
      children: [{id: 'shape-diamond'}, {id: 'shape-circle'}, {id: 'mesh-preview'}],
    })
    expect(getRootIds(promoted)).toEqual(['shapes', 'mesh-preview'])
    expect(getRootIds(rootEnd)).toEqual(['mesh-preview', 'shapes'])
  })

  test('should reject invalid relative drop targets', () => {
    const document = createDemoDocument()

    expect(
      moveSceneNodeRelative({
        document,
        nodeId: 'mesh-preview',
        position: 'inside',
        targetNodeId: 'shape-circle',
      }),
    ).toBeUndefined()
    expect(
      moveSceneNodeRelative({
        document,
        nodeId: 'mesh-preview',
        position: 'before',
        targetNodeId: null,
      }),
    ).toBeUndefined()
    expect(
      moveSceneNodeRelative({
        document,
        nodeId: 'shapes',
        position: 'inside',
        targetNodeId: 'shapes',
      }),
    ).toBeUndefined()
  })

  test('should reject hierarchy edits inherited from a locked group', () => {
    const document = createDemoDocument()
    const locked = setSceneNodeState({document, locked: true, nodeId: 'shapes'})!

    expect(moveSceneNodeBy(locked, 'shape-circle', 1)).toBeUndefined()
    expect(createSceneGroup(locked, ['shape-circle', 'shape-diamond'])).toBeUndefined()
    expect(ungroupSceneNode(locked, 'shapes')).toBeUndefined()
  })
})
