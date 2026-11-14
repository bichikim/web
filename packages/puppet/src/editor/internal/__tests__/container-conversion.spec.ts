import {createKeyedParameter} from './parameter-keyforms/fixtures'
import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  getDocumentScene,
  getScenePartStates,
  parseDocument,
  type PuppetDocument,
} from '../../../player'
import {setGroupRenderProperties} from '../group-properties'

import {createDeformer, createSceneGroup, setSceneNodeState} from '../scene-graph'
import {convertSceneContainers, getContainerKind} from '../container-conversion'

describe('convertSceneContainers', () => {
  test.each(['deformer', 'group', 'curve', 'bone', 'pin', 'rotation', 'spatial'] as const)(
    'should preserve parameter visibility while converting to %s',
    (targetKind) => {
      const original = createDemoDocument()
      const source =
        targetKind === 'group'
          ? convertSceneContainers({
              document: original,
              nodeIds: ['shapes'],
              targetKind: 'deformer',
            })!
          : original
      const document = {
        ...source,
        scene: {
          roots: getDocumentScene(source).roots.map((node) =>
            node.id === 'shapes'
              ? {...node, parameterVisibility: [{maximum: 30, minimum: 1, parameterId: 'angle-x'}]}
              : node,
          ),
        },
      }
      const before = getScenePartStates(document).find((part) => part.partId === 'shape-circle')!
      expect(before.visible).toBe(false)
      const converted = convertSceneContainers({document, nodeIds: ['shapes'], targetKind})!
      expect(
        getScenePartStates(converted).find((part) => part.partId === 'shape-circle')?.visible,
      ).toBe(false)
      expect(parseDocument(JSON.stringify(converted)).ok).toBe(true)
    },
  )

  test('should create a 3D deformer and attach its child image surfaces', () => {
    const source = createDemoDocument()
    const converted = convertSceneContainers({
      document: source,
      nodeIds: ['shapes'],
      targetKind: 'spatial',
    })!
    const node = getDocumentScene(converted).roots.find((candidate) => candidate.id === 'shapes')!
    expect(getContainerKind(node)).toBe('spatial')
    expect(node).toMatchObject({
      deformerType: 'spatial',
    })
    expect(converted.parts.find((part) => part.id === 'shape-circle')?.spatial?.groupId).toBe(
      'shapes',
    )
    expect(parseDocument(JSON.stringify(converted)).ok).toBe(true)

    const restored = convertSceneContainers({
      document: converted,
      nodeIds: ['shapes'],
      targetKind: 'group',
    })!
    expect(restored.parts.find((part) => part.id === 'shape-circle')?.spatial).toBeUndefined()
  })
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
      rotationOrigin: {x: 388, y: 243},
      rows: 2,
    })
    expect(empty).toMatchObject({
      bounds: {height: converted.viewport.height, width: converted.viewport.width, x: 0, y: 0},
      children: [],
      id: 'group',
      kind: 'deformer',
      name: '새 그룹',
      rotationOrigin: {
        x: converted.viewport.width / 2,
        y: converted.viewport.height / 2,
      },
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
    const added = createKeyedParameter({document: hidden, nodeIds: [deformer.id]})!
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

  test('should carry opacity and colors across container conversions', () => {
    const shared = {
      multiplyColor: [1, 0.5, 0.25],
      opacity: 0.4,
      screenColor: [0.1, 0.2, 0.3],
    } as const
    const source = setGroupRenderProperties(createDemoDocument(), 'shapes', {
      ...shared,
      clippingMaskIds: ['mesh-preview'],
      drawOrder: 300,
      offscreen: true,
    })!
    const properties = (document: PuppetDocument) =>
      getDocumentScene(document).roots.find((node) => node.id === 'shapes')!
    const deformer = convertSceneContainers({
      document: source,
      nodeIds: ['shapes'],
      targetKind: 'deformer',
    })!
    expect(properties(deformer)).toMatchObject({kind: 'deformer', properties: shared})
    const pin = convertSceneContainers({
      document: deformer,
      nodeIds: ['shapes'],
      targetKind: 'pin',
    })!
    expect(properties(pin)).toMatchObject({kind: 'deformer', properties: shared})
    const group = convertSceneContainers({document: pin, nodeIds: ['shapes'], targetKind: 'group'})!
    expect(properties(group)).toEqual(expect.objectContaining({kind: 'group', properties: shared}))
    for (const document of [deformer, pin, group]) {
      expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
    }
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

test('should switch each container kind while preserving identity and children', () => {
  let document = createDemoDocument()
  const original = getDocumentScene(document).roots.find((node) => node.id === 'shapes')!
  for (const targetKind of ['curve', 'bone', 'deformer', 'group'] as const) {
    document = convertSceneContainers({document, nodeIds: ['shapes'], targetKind})!
    const node = getDocumentScene(document).roots.find((node) => node.id === 'shapes')!
    expect(getContainerKind(node)).toBe(targetKind)
    expect(node.name).toBe(original.name)
    expect(node.kind !== 'part' && node.children).toEqual(
      original.kind !== 'part' && original.children,
    )
    expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
  }
})

test('should create a dedicated rotation container with one rigid joint and preserve its children on reload', () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'rotation',
  })!
  const node = getDocumentScene(document).roots.find((node) => node.id === 'shapes')!
  expect(getContainerKind(node)).toBe('rotation')
  expect(node).toMatchObject({
    children: [{id: 'shape-circle'}, {id: 'shape-diamond'}],
    columns: 1,
    deformerType: 'rotation',
    rows: 1,
  })
  if (node.kind !== 'deformer') {
    throw new Error('Expected deformer')
  }
  expect(node.boneRestPoints).toHaveLength(4)
  expect(node.controlPoints).toEqual(node.boneRestPoints)
  expect(parseDocument(JSON.stringify(document)).ok).toBe(true)
  expect(
    parseDocument(JSON.stringify({...document, scene: {roots: [{...node, boneWeights: []}]}})).ok,
  ).toBe(false)
})
