import {describe, expect, test} from 'vitest'

import {createDemoDocument, getDocumentScene, parseDocument} from '../../../player'
import {addParameter} from '../parameter-keyforms'
import {createDeformer, createSceneGroup, setSceneNodeState} from '../scene-graph'
import {convertSceneContainers} from '../container-conversion'

describe('convertSceneContainers', () => {
  test('should convert groups to deformers while preserving container identity and children', () => {
    const grouped = createSceneGroup(createDemoDocument(), [])!
    const converted = convertSceneContainers({
      document: grouped,
      nodeIds: ['shapes', 'group'],
      targetKind: 'deformer',
    })!
    const [shapes, empty] = getDocumentScene(converted).roots.filter(
      (node) => node.id === 'shapes' || node.id === 'group',
    )

    expect(shapes).toMatchObject({
      children: [{id: 'shape-circle'}, {id: 'shape-diamond'}],
      columns: 2,
      id: 'shapes',
      kind: 'deformer',
      name: 'Shapes',
      rows: 2,
    })
    expect(empty).toMatchObject({
      bounds: {height: converted.viewport.height, width: converted.viewport.width, x: 0, y: 0},
      children: [],
      id: 'group',
      kind: 'deformer',
      name: '새 그룹',
    })
    expect(parseDocument(JSON.stringify(converted)).ok).toBe(true)
  })

  test('should convert deformers to groups and remove their parameter targets', () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const hidden = setSceneNodeState({
      document: deformerDocument,
      nodeId: deformer.id,
      visible: false,
    })!
    const added = addParameter({document: hidden, nodeIds: [deformer.id]})!
    const converted = convertSceneContainers({
      document: added.document,
      nodeIds: [deformer.id],
      targetKind: 'group',
    })!
    const group = getDocumentScene(converted).roots[0]!

    expect(group).toMatchObject({
      children: [{id: 'mesh-preview'}],
      id: deformer.id,
      kind: 'group',
      name: '새 자유 변형 디포머',
      visible: false,
    })
    expect('controlPoints' in group).toBe(false)
    expect(converted.parameterBindings?.[0]).toMatchObject({
      keyforms: [{deformers: []}],
      targetDeformerIds: [],
    })
    expect(parseDocument(JSON.stringify(converted)).ok).toBe(true)
  })

  test('should reject mixed or locked container conversion atomically', () => {
    const locked = setSceneNodeState({
      document: createDemoDocument(),
      locked: true,
      nodeId: 'shapes',
    })!

    expect(
      convertSceneContainers({
        document: createDemoDocument(),
        nodeIds: ['shapes', 'mesh-preview'],
        targetKind: 'deformer',
      }),
    ).toBeUndefined()
    expect(
      convertSceneContainers({document: locked, nodeIds: ['shapes'], targetKind: 'deformer'}),
    ).toBeUndefined()
  })
})
