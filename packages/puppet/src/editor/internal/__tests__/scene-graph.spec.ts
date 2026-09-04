import {describe, expect, test} from 'vitest'

import {transformDeformerPoint} from '../../../deformation'
import {createDemoDocument, parseDocument} from '../../../player'
import {addDeformerCurveHandle, setDeformerCurveHandle} from '../deformer-curve-handles'
import {addParameter, setParameterKeyformDeformerPoint} from '../parameter-keyforms'
import {getDocumentScene} from '../../../player/scene'
import {
  createDeformer,
  createSceneGroup,
  getSceneNode,
  getSceneSelectionPartIds,
  moveSceneNode,
  moveSceneNodeBy,
  moveSceneNodeRelative,
  moveSceneNodeToParent,
  renameSceneNode,
  resizeDeformer,
  setSceneNodeState,
  unwrapSceneNode,
  unwrapSceneNodes,
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
    const renamed = renameSceneNode(grouped, 'group', 'Face')!
    const hidden = setSceneNodeState({
      document: renamed,
      nodeId: 'group',
      visible: false,
    })!
    const locked = setSceneNodeState({document: hidden, locked: true, nodeId: 'group'})!
    const moved = moveSceneNodeBy(hidden, 'group', -1)!
    const nested = moveSceneNode({document: moved, nodeId: 'mesh-preview', parentId: 'group'})!
    const promoted = moveSceneNodeToParent(nested, 'mesh-preview')!
    const ungrouped = unwrapSceneNode(promoted, 'group')!

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

  test('should unwrap multiple selected containers atomically', () => {
    const firstGroup = createSceneGroup({...createDemoDocument(), scene: undefined}, [
      'mesh-preview',
    ])!
    const secondGroup = createSceneGroup(firstGroup, ['shape-circle', 'shape-diamond'])!
    const containerIds = getDocumentScene(secondGroup)
      .roots.filter((node) => node.kind === 'group')
      .map((node) => node.id)
    const unwrapped = unwrapSceneNodes(secondGroup, containerIds)!

    expect(getRootIds(unwrapped)).toEqual(['mesh-preview', 'shape-circle', 'shape-diamond'])
    expect(unwrapSceneNodes(secondGroup, [...containerIds, 'missing'])).toBeUndefined()
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
    expect(unwrapSceneNode(locked, 'shapes')).toBeUndefined()
  })

  test('should create deformers around selected descendants and preserve their order', () => {
    const document = {...createDemoDocument(), scene: undefined}
    const deformerDocument = createDeformer(document, ['shape-circle', 'shape-diamond'])!
    const deformer = getDocumentScene(deformerDocument).roots[1]

    expect(deformer).toMatchObject({
      children: [{id: 'shape-circle'}, {id: 'shape-diamond'}],
      columns: 2,
      kind: 'deformer',
      name: '새 자유 변형 디포머',
      rows: 2,
    })
    expect(deformer?.kind === 'deformer' ? deformer.controlPoints : []).toHaveLength(18)
  })

  test('should move and reorder nodes inside a deformer', () => {
    const document = createDemoDocument()
    const deformerDocument = createDeformer(document, ['shape-circle'])!
    const deformer = getSceneNode(deformerDocument, 'deformer')
    const nested = moveSceneNodeRelative({
      document: deformerDocument,
      nodeId: 'shape-diamond',
      position: 'inside',
      targetNodeId: deformer?.id ?? null,
    })!
    const reordered = moveSceneNodeRelative({
      document: nested,
      nodeId: 'shape-diamond',
      position: 'before',
      targetNodeId: 'shape-circle',
    })!

    expect(deformer).toMatchObject({kind: 'deformer'})
    expect(getSceneNode(reordered, deformer!.id)).toMatchObject({
      children: [{id: 'shape-diamond'}, {id: 'shape-circle'}],
      kind: 'deformer',
    })
  })

  test('should resize a grid and synchronize every parameter keyform', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const added = addParameter({document: deformerDocument, nodeIds: [deformer.id]})!
    const edited = setParameterKeyformDeformerPoint({
      bindingId: added.binding.id,
      document: added.document,
      nodeId: deformer.id,
      pointIndex: 4,
      values: [0],
      x: 400,
      y: 240,
    })!
    const resized = resizeDeformer({
      columns: 3,
      document: edited,
      nodeId: deformer.id,
      rows: 1,
    })!
    const resizedDeformer = getDocumentScene(resized).roots[0]
    const keyformDeformer = resized.parameterBindings?.find(
      (binding) => binding.id === added.binding.id,
    )?.keyforms[0]?.deformers?.[0]

    expect(resizedDeformer).toMatchObject({columns: 3, rows: 1})
    expect(resizedDeformer?.kind === 'deformer' ? resizedDeformer.controlPoints : []).toHaveLength(
      16,
    )
    expect(keyformDeformer?.controlPoints).toHaveLength(16)
    expect(parseDocument(JSON.stringify(resized)).ok).toBe(true)

    const locked = setSceneNodeState({document: resized, locked: true, nodeId: deformer.id})!
    expect(
      resizeDeformer({columns: 2, document: locked, nodeId: deformer.id, rows: 2}),
    ).toBeUndefined()
  })

  test('should resample rest and parameter keyforms from the curved surface', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const withHandle = addDeformerCurveHandle(deformerDocument, deformer.id, 0)!
    const handledDeformer = getDocumentScene(withHandle).roots[0]
    const neutralHandle =
      handledDeformer?.kind === 'deformer' ? handledDeformer.curveHandles?.[0] : undefined

    if (neutralHandle === undefined) {
      throw new Error('Expected a curve handle')
    }

    const curved = setDeformerCurveHandle({
      axis: 'horizontal',
      document: withHandle,
      nodeId: deformer.id,
      point: {x: neutralHandle.horizontal.x, y: neutralHandle.horizontal.y + 100},
      pointIndex: 0,
    })!
    const added = addParameter({document: curved, nodeIds: [deformer.id]})!
    const sourceDeformer = getDocumentScene(added.document).roots[0]!

    if (sourceDeformer.kind !== 'deformer') {
      throw new Error('Expected a deformer')
    }

    const expected = transformDeformerPoint(sourceDeformer, {
      x: sourceDeformer.bounds.x + sourceDeformer.bounds.width / 4,
      y: sourceDeformer.bounds.y,
    })
    const resized = resizeDeformer({
      columns: 4,
      document: added.document,
      nodeId: deformer.id,
      rows: sourceDeformer.rows,
    })!
    const resizedDeformer = getDocumentScene(resized).roots[0]
    const restPoint =
      resizedDeformer?.kind === 'deformer' ? resizedDeformer.controlPoints.slice(2, 4) : undefined
    const keyformPoints = resized.parameterBindings?.[0]?.keyforms.map((keyform) =>
      keyform.deformers?.[0]?.controlPoints.slice(2, 4),
    )

    expect(restPoint?.[0]).toBeCloseTo(expected.x, 8)
    expect(restPoint?.[1]).toBeCloseTo(expected.y, 8)
    expect(keyformPoints?.length).toBeGreaterThan(0)
    for (const point of keyformPoints ?? []) {
      expect(point?.[0]).toBeCloseTo(expected.x, 8)
      expect(point?.[1]).toBeCloseTo(expected.y, 8)
    }
    expect(parseDocument(JSON.stringify(resized)).ok).toBe(true)
  })
})
