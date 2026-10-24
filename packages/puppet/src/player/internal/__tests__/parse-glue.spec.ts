import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument} from '../../../player'
import {hasValidGlue} from '../parse-glue'
const glue = {
  first: {partId: 'mesh-preview', vertexIndex: 0},
  id: 'seam',
  second: {partId: 'shape-diamond', vertexIndex: 0},
  strength: 1,
  weight: 0.5,
}
test('should accept glue vertices in meshes without rendered triangles', () => {
  const parts = createDemoDocument().parts.map((part) => ({
    ...part,
    mesh: {...part.mesh, indices: []},
  }))
  expect(hasValidGlue([glue], parts)).toBe(true)
  expect(hasValidGlue([{...glue, first: {...glue.first, vertexIndex: 999}}], parts)).toBe(false)
})
test('should reject malformed, overlapping and dangling glue references', () => {
  const document = createDemoDocument()
  expect(hasValidGlue(undefined, document.parts)).toBe(true)
  expect(hasValidGlue([glue], document.parts)).toBe(true)
  for (const value of [
    null,
    {},
    [glue, {...glue, id: 'other'}],
    [{...glue, strength: 2}],
    [{...glue, first: {...glue.first, vertexIndex: 999}}],
    [{...glue, second: {...glue.second, partId: 'missing'}}],
  ]) {
    expect(hasValidGlue(value, document.parts)).toBe(false)
    expect(parseDocument(JSON.stringify({...document, glue: value})).ok).toBe(false)
  }
})

test('should allow explicitly sequential native joins while retaining disjoint editor joins', () => {
  const parts = createDemoDocument().parts
  const native = {...glue, composition: 'sequential'}
  const next = {...native, id: 'next', second: {...glue.second, vertexIndex: 1}}
  expect(hasValidGlue([native, next], parts)).toBe(true)
  expect(hasValidGlue([glue, next], parts)).toBe(false)
  expect(hasValidGlue([native, {...next, composition: undefined}], parts)).toBe(false)
  expect(hasValidGlue([{...native, composition: 'unknown'}], parts)).toBe(false)
  expect(hasValidGlue([native, {...next, id: native.id}], parts)).toBe(false)
})

test('should validate shared target edges and reject conflicts and invalid edge coordinates', () => {
  const parts = createDemoDocument().parts
  const connection = {
    ...glue,
    second: {...glue.second, edge: {endIndex: 1, position: 0.5}},
    weight: 1,
  }
  expect(
    hasValidGlue(
      [connection, {...connection, first: {...glue.first, vertexIndex: 1}, id: 'next'}],
      parts,
    ),
  ).toBe(true)
  for (const edge of [
    {endIndex: 4, position: 0.5},
    {endIndex: 0, position: 0.5},
    {endIndex: 1, position: 2},
    {endIndex: 1, position: NaN},
  ]) {
    expect(hasValidGlue([{...connection, second: {...connection.second, edge}}], parts)).toBe(false)
  }
  expect(hasValidGlue([{...connection, weight: 0.5}], parts)).toBe(false)
  expect(
    hasValidGlue(
      [connection, {...glue, first: {...glue.first, vertexIndex: 1}, id: 'conflict'}],
      parts,
    ),
  ).toBe(false)
})
