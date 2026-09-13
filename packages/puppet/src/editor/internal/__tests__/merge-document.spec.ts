import skinningExample from '../../../../examples/rotation-skinning.json'
import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addGlue, setGlueKeyform} from '../glue'
import {mergeDocument} from '../merge-document'

test('should append a complete model without joining colliding identifiers', () => {
  const joined = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  const original = setGlueKeyform({
    bindingId: joined.parameterBindings![0]!.id,
    document: joined,
    glueId: joined.glue![0]!.id,
    changes: {strength: 0.4, weight: 0.8},
    values: [0, 0],
  })!
  const result = mergeDocument(original, original)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const merged = result.document
  expect(merged.parts).toHaveLength(6)
  expect(merged.parts.slice(0, 3)).toEqual(original.parts)
  expect(merged.parameters).toHaveLength(4)
  expect(merged.glue).toHaveLength(2)
  expect(
    merged
      .parameterBindings![1]!.keyforms.flatMap((form) =>
        form.parts.flatMap((part) => part.glue ?? []),
      )
      .map((glue) => glue.id),
  ).toContain(merged.glue![1]!.id)
  expect(merged.glue![1]!.first.partId).toBe(merged.parts[3]!.id)
  expect(merged.parameterBindings![1]!.targetPartIds).toEqual([merged.parts[3]!.id])
  expect(merged.parts[4]!.properties!.clippingMaskIds).toEqual([merged.parts[3]!.id])
  expect(merged.viewport).toEqual(original.viewport)
  expect(parseDocument(serializeDocument(merged)).ok).toBe(true)
  const again = mergeDocument(merged, original)
  expect(again.ok).toBe(true)
  if (again.ok) {
    expect(new Set(again.document.parts.map((part) => part.id)).size).toBe(9)
  }
})

test('should preserve skinning and deformer references when importing a rigged model twice', () => {
  const parsed = parseDocument(JSON.stringify(skinningExample))
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    return
  }
  const result = mergeDocument(parsed.document, parsed.document)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    return
  }
  const roots = result.document.scene!.roots
  expect(roots).toHaveLength(parsed.document.scene!.roots.length * 2)
  expect(JSON.stringify(roots.slice(parsed.document.scene!.roots.length))).toContain('import-1:')
  expect(
    result.document
      .parameterBindings!.slice(parsed.document.parameterBindings!.length)
      .every((binding) => binding.targetDeformerIds?.every((id) => id.startsWith('import-1:'))),
  ).toBe(true)
})
