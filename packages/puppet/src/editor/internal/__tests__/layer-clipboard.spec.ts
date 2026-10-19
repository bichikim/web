import skinningExample from '../../../../examples/rotation-skinning.json'
import {expect, test} from 'vitest'
import {createDemoDocument, getDocumentScene, parseDocumentValue} from '../../../player'
import {findNode, getContainerIds} from '../scene-tree'
import {createDeformer} from '../scene-graph'
import {createLayerFragment, pasteLayerFragment, removeLayerNodes} from '../layer-clipboard'

test('should copy a deformer subtree with new identifiers and valid parameter references', () => {
  const source = createDeformer(createDemoDocument(), ['shape-circle'])!
  const node = [...getContainerIds(getDocumentScene(source).roots)]
    .map((id) => findNode(getDocumentScene(source).roots, id))
    .find((candidate) => candidate?.kind === 'deformer')!
  const fragment = createLayerFragment(source, [node.id])!
  const result = pasteLayerFragment(source, fragment, node.id)!
  expect(result.document.parts).toHaveLength(source.parts.length + 1)
  expect(result.nodeIds).toHaveLength(1)
  expect(result.nodeIds[0]).not.toBe(node.id)
  expect(parseDocumentValue(result.document).ok).toBe(true)
  expect(fragment.scene!.roots[0]!.id).toBe(node.id)
})

test('should remove a subtree and all of its references without changing the source', () => {
  const source = createDeformer(createDemoDocument(), ['shape-circle'])!
  const node = [...getContainerIds(getDocumentScene(source).roots)]
    .map((id) => findNode(getDocumentScene(source).roots, id))
    .find((candidate) => candidate?.kind === 'deformer')!
  const result = removeLayerNodes(source, [node.id])!
  expect(result.parts.some((part) => part.id === 'shape-circle')).toBe(false)
  expect(JSON.stringify(result.parameterBindings)).not.toContain(node.id)
  expect(parseDocumentValue(result).ok).toBe(true)
  expect(source.parts.some((part) => part.id === 'shape-circle')).toBe(true)
})

test('should retain clipboard contents after cutting and allow repeated pastes', () => {
  const source = createDemoDocument()
  const fragment = createLayerFragment(source, ['shape-circle'])!
  const cut = removeLayerNodes(source, ['shape-circle'])!
  const first = pasteLayerFragment(cut, fragment, 'shape-diamond')!
  const second = pasteLayerFragment(first.document, fragment, first.nodeIds[0]!)!
  expect(second.document.parts).toHaveLength(source.parts.length + 1)
  expect(first.nodeIds[0]).not.toBe(second.nodeIds[0])
  expect(parseDocumentValue(second.document).ok).toBe(true)
})

test('should reject locked descendants and normalize parent plus child selections', () => {
  const source = createDemoDocument()
  const fragment = createLayerFragment(source, ['shapes', 'shape-circle'])
  expect(fragment?.parts).toHaveLength(2)
  const locked = {
    ...source,
    scene: {roots: getDocumentScene(source).roots.map((node) => ({...node, locked: true}))},
  }
  expect(removeLayerNodes(locked, ['shape-circle'])).toBeUndefined()
  expect(
    pasteLayerFragment(locked, createLayerFragment(source, ['shape-circle'])!, 'shape-circle'),
  ).toBeUndefined()
})

test('should paste at the root after cutting the entire document', () => {
  const source = createDemoDocument()
  const nodeIds = getDocumentScene(source).roots.map((node) => node.id)
  const fragment = createLayerFragment(source, nodeIds)!
  const empty = removeLayerNodes(source, nodeIds)!
  expect(empty.parts).toHaveLength(0)
  const result = pasteLayerFragment(empty, fragment, null)!
  expect(result.document.parts).toHaveLength(source.parts.length)
  expect(parseDocumentValue(result.document).ok).toBe(true)
})

test('should retain masks outside the copied selection', () => {
  const source = createDemoDocument()
  const document = {
    ...source,
    parts: source.parts.map((part) =>
      part.id === 'shape-circle'
        ? {...part, properties: {...part.properties, clippingMaskIds: ['shape-diamond']}}
        : part,
    ),
  }
  const fragment = createLayerFragment(document, ['shape-circle'])!
  const result = pasteLayerFragment(document, fragment, 'shape-circle')!
  const copied = result.document.parts.find(
    (part) => part.id !== 'shape-circle' && part.id.endsWith(':shape-circle'),
  )!
  expect(copied.properties?.clippingMaskIds).toEqual(['shape-diamond'])
  expect(parseDocumentValue(result.document).ok).toBe(true)
})

test('should retain external skinning influences when pasting beside the source part', () => {
  const parsed = parseDocumentValue(skinningExample)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    return
  }
  const source = parsed.document
  const roots = getDocumentScene(source).roots
  const node = source.parts
    .map((part) => findNode(roots, part.id))
    .find((candidate) => candidate?.kind === 'part' && candidate.skinning !== undefined)!
  const fragment = createLayerFragment(source, [node.id])!
  const result = pasteLayerFragment(source, fragment, node.id)!
  expect(result).toBeDefined()
  const copy = findNode(getDocumentScene(result.document).roots, result.nodeIds[0]!)!
  expect(copy.kind === 'part' && copy.skinning).toEqual(node.kind === 'part' && node.skinning)
  expect(parseDocumentValue(result.document).ok).toBe(true)
})
