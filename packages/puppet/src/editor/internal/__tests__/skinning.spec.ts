import {replaceSkinWeights} from '../skinning-edit'
import example from '../../../../examples/three-parts-skinning.json'
import {parseDocument} from '../../../player/parse-document'
import {expect, test} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {
  changeSkinWeight,
  configurePartSkinning,
  connectSkinSelection,
  reconcileSkinning,
  setPartSkinning,
} from '../skinning'
import {findNode} from '../scene-tree'

const binding = (document: ReturnType<typeof createSkinDocument>) => {
  const node = findNode(document.scene.roots, document.parts[0]!.id)
  if (node?.kind !== 'part' || node.skinning === undefined) {
    throw new Error('Missing skin')
  }
  return node.skinning
}

test('should normalize other influences while editing one vertex or the entire part', () => {
  const skin = binding(createSkinDocument())
  const edited = changeSkinWeight(skin, 0, 0.8, 0)
  expect(edited.influences[0]!.weights[0]).toBe(0.8)
  expect(edited.influences[1]!.weights[0]).toBeCloseTo(0.2)
  expect(edited.influences[0]!.weights[1]).toBe(skin.influences[0]!.weights[1])
})

test('should remove invalid bindings after deleting a rotation or replacing mesh topology', () => {
  const document = createSkinDocument()
  const removed = reconcileSkinning(document, {
    ...document,
    scene: {roots: document.scene.roots.filter((node) => node.id !== 'Elbow')},
  })
  const part = findNode(removed.scene!.roots, document.parts[0]!.id)
  expect(part?.kind === 'part' ? part.skinning : null).toBeUndefined()
  const changed = reconcileSkinning(document, {
    ...document,
    parts: document.parts.map((part, index) =>
      index === 0
        ? {...part, mesh: {...part.mesh, indices: [...part.mesh.indices].reverse()}}
        : part,
    ),
  })
  const changedPart = findNode(changed.scene!.roots, document.parts[0]!.id)
  expect(changedPart?.kind === 'part' ? changedPart.skinning : null).toBeUndefined()
  expect(reconcileSkinning(document, document)).toBe(document)
})

test('should preserve fixed attachments and the mixed distribution during whole-part edits', () => {
  const skin = binding(createSkinDocument())
  const source = {
    ...skin,
    influences: skin.influences.map((influence, index) => ({
      ...influence,
      weights: index === 0 ? [0, 0.2, 0.4, 1] : [1, 0.8, 0.6, 0],
    })),
  }
  const edited = changeSkinWeight(source, 0, 0.6)
  expect(edited.influences[0]!.strength).toBeCloseTo(1.1)
  expect(edited.influences[0]!.weights[0]).toBe(0)
  expect(edited.influences[0]!.weights[3]).toBe(1)
  expect(edited.influences[0]!.weights[1]).toBeLessThan(edited.influences[0]!.weights[2]!)
  edited.influences[0]!.weights.forEach((weight, index) => {
    expect(weight + edited.influences[1]!.weights[index]!).toBeCloseTo(1)
  })
  const restored = changeSkinWeight(edited, 0, 0.5)
  restored.influences[0]!.weights.forEach((weight, index) =>
    expect(weight).toBeCloseTo(source.influences[0]!.weights[index]!),
  )
  for (const value of [0, 1]) {
    const extreme = changeSkinWeight(source, 0, value)
    expect(extreme.influences[0]!.weights[1]).toBeGreaterThan(0)
    expect(extreme.influences[0]!.weights[2]).toBeLessThan(1)
  }
  expect(
    changeSkinWeight(
      {
        ...source,
        influences: source.influences.map((influence, index) => ({
          ...influence,
          weights: index === 0 ? [0, 1] : [1, 0],
        })),
      },
      0,
      0.5,
    ).influences[0]!.weights,
  ).toEqual([0, 1])
})

test('should keep weights continuous near fixed endpoints when increasing or decreasing the strength', () => {
  const skin = binding(createSkinDocument())
  const weights = [0, 0.000001, 0.2, 0.4, 0.6, 0.8, 0.999999, 1]
  const source = {
    ...skin,
    influences: skin.influences.map((influence, index) => ({
      ...influence,
      weights: weights.map((weight) => (index === 0 ? weight : 1 - weight)),
    })),
  }
  for (const value of [0.2, 0.8]) {
    const edited = changeSkinWeight(source, 0, value).influences[0]!.weights
    expect(edited[1]).toBeLessThan(0.001)
    expect(edited[6]).toBeGreaterThan(0.999)
  }
})

test('should synchronize coincident skin boundaries by bone id and respect locked parts', () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const document = parsed.document
  const part = findNode(document.scene!.roots, 'a')!
  if (part.kind !== 'part' || part.skinning === undefined) {
    throw new Error('Missing binding')
  }
  const edited = changeSkinWeight({...part.skinning, syncSeams: true}, 0, 0.8, 32)
  const next = setPartSkinning(document, 'a', edited)
  const b = findNode(next.scene!.roots, 'b')!
  if (b.kind !== 'part') {
    throw new Error('Missing part')
  }
  expect(b.skinning!.influences.find((i) => i.nodeId === 'root')!.weights[0]).toBeCloseTo(0.8)
  expect(b.skinning!.syncSeams).toBe(true)
  const reverse = setPartSkinning(
    next,
    'b',
    replaceSkinWeights(b.skinning!, 0, new Map([[0, 0.3]])),
  )
  const reversePart = findNode(reverse.scene!.roots, 'a')!
  if (reversePart.kind !== 'part') {
    throw new Error('Missing part')
  }
  expect(reversePart.skinning!.influences[0]!.weights[32]).toBeCloseTo(0.3)
  const disabled = setPartSkinning(next, 'a', {...edited, syncSeams: false})
  const disabledPart = findNode(disabled.scene!.roots, 'b')!
  expect(disabledPart.kind === 'part' && disabledPart.skinning?.syncSeams).toBe(false)
  const locked = {
    ...document,
    scene: {
      roots: document.scene!.roots.map((n) =>
        n.kind === 'deformer'
          ? {...n, children: n.children.map((c) => (c.id === 'b' ? {...c, locked: true} : c))}
          : n,
      ),
    },
  }
  expect(setPartSkinning(locked, 'a', edited)).toBe(locked)
  expect(parseDocument(JSON.stringify(next)).ok).toBe(true)
  const edged = {
    ...document,
    glue: [
      {
        first: {partId: 'a', vertexIndex: 32},
        id: 'edge',
        second: {edge: {endIndex: 2, position: 0.5}, partId: 'b', vertexIndex: 0},
        strength: 1,
        weight: 1,
      },
    ],
  }
  const joined = setPartSkinning(edged, 'a', edited)
  const joinedPart = findNode(joined.scene!.roots, 'b')!
  if (joinedPart.kind !== 'part') {
    throw new Error('Missing part')
  }
  expect(joinedPart.skinning!.influences[0]!.weights[2]).toBeCloseTo(0.8)
})

test('should connect explicitly selected independent joints and preserve them when changing mode', () => {
  const initial = createSkinDocument()
  const partId = initial.parts[0]!.id
  const unbound = setPartSkinning(initial, partId)
  const connected = connectSkinSelection({
    document: unbound,
    nodeIds: [partId, 'Shoulder', 'Elbow'],
  })
  const node = findNode(connected.scene!.roots, partId)
  expect(node?.kind === 'part' && node.skinning?.influences.map((item) => item.nodeId)).toEqual([
    'Shoulder',
    'Elbow',
  ])
  expect(
    configurePartSkinning(connected, partId, {mode: 'smooth'})?.influences.map(
      (item) => item.nodeId,
    ),
  ).toEqual(['Shoulder', 'Elbow'])
  expect(connectSkinSelection({document: unbound, nodeIds: [partId, 'Shoulder']})).toBe(unbound)
})

test('should add and remove explicit joints without restoring removed targets on recalculation', () => {
  const parsed = parseDocument(JSON.stringify(example))
  if (!parsed.ok) {
    throw new Error('Invalid example')
  }
  const document = parsed.document
  const connected = connectSkinSelection({document, nodeIds: ['a', 'root', 'middle']})
  const added = connectSkinSelection({append: true, document: connected, nodeIds: ['a', 'tip']})
  const node = findNode(added.scene!.roots, 'a')
  expect(node?.kind === 'part' && node.skinning?.influences.map((item) => item.nodeId)).toEqual([
    'root',
    'middle',
    'tip',
  ])
  const removed = configurePartSkinning(added, 'a', {mode: 'smooth'}, ['root', 'tip'])
  expect(removed?.influences.map((item) => item.nodeId)).toEqual(['root', 'tip'])
  const result = setPartSkinning(added, 'a', removed)
  expect(
    configurePartSkinning(result, 'a', {mode: 'joint', range: 2})?.influences.map(
      (item) => item.nodeId,
    ),
  ).toEqual(['root', 'tip'])
})
