import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../index'
import {addGlue, setGlueKeyform} from '../../editor/internal/glue'

test('should validate independent Glue targets and reject ambiguous or dangling direct samples', () => {
  const legacy = createDocument()
  const source = legacy.parameterBindings![0]!
  const sample = {id: 'glue-1', strength: 0.4, weight: 0.5}
  const binding = {
    ...source,
    keyforms: source.keyforms.map((form) => ({glue: [sample], parts: [], values: form.values})),
    targetGlueIds: ['glue-1'],
    targetPartIds: undefined,
  }
  const valid = {...legacy, parameterBindings: [binding]}
  expect(parseDocument(JSON.stringify(valid)).ok).toBe(true)
  for (const changes of [
    {targetGlueIds: ['missing']},
    {targetGlueIds: ['glue-1', 'glue-1']},
    {keyforms: binding.keyforms.map((form) => ({...form, glue: []}))},
    {keyforms: binding.keyforms.map((form) => ({...form, glue: [sample, sample]}))},
    {keyforms: binding.keyforms.map((form) => ({...form, glue: [{...sample, id: 'missing'}]}))},
    {keyforms: binding.keyforms.map((form) => ({...form, glue: [{...sample, strength: 2}]}))},
    {
      keyforms: binding.keyforms.map((form) => ({
        ...form,
        parts: [{glue: [sample], partId: 'mesh-preview', vertices: []}],
      })),
    },
  ]) {
    expect(
      parseDocument(JSON.stringify({...valid, parameterBindings: [{...binding, ...changes}]})).ok,
    ).toBe(false)
  }
})

const createDocument = () => {
  const document = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  return setGlueKeyform({
    bindingId: document.parameterBindings![0]!.id,
    changes: {strength: 0.2, weight: 0.5},
    document,
    glueId: 'glue-1',
    values: [0, 0],
  })!
}
test.each([
  {id: 'missing', strength: 1, weight: 0.5},
  {id: 'glue-1', strength: 1, weight: 2},
  {id: 'glue-1', strength: 'bad', weight: 0.5},
  {id: 'glue-1', weight: 0.5},
])('should reject invalid Glue keyform samples %j', (sample) => {
  const document = createDocument()
  const value = {
    ...document,
    parameterBindings: document.parameterBindings!.map((binding) => ({
      ...binding,
      keyforms: binding.keyforms.map((form) => ({
        ...form,
        parts: form.parts.map((part) => ({...part, glue: [sample]})),
      })),
    })),
  }
  expect(parseDocument(JSON.stringify(value)).ok).toBe(false)
})
test('should reject duplicate Glue keyform samples', () => {
  const document = createDocument()
  const value = {
    ...document,
    parameterBindings: document.parameterBindings!.map((binding) => ({
      ...binding,
      keyforms: binding.keyforms.map((form) => ({
        ...form,
        parts: form.parts.map((part) => ({
          ...part,
          glue: [...(part.glue ?? []), ...(part.glue ?? [])],
        })),
      })),
    })),
  }
  expect(parseDocument(JSON.stringify(value)).ok).toBe(false)
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
})

test('should opt imported documents into sequential shared-vertex glue without changing legacy validation', () => {
  const document = createDemoDocument()
  const first = document.parts[0]!.id
  const second = document.parts[1]!.id
  const glue = [0, 1].map((vertexIndex) => ({
    first: {partId: first, vertexIndex: 0},
    id: `shared-${vertexIndex}`,
    second: {partId: second, vertexIndex},
    strength: 1,
    weight: 1,
  }))
  const input = {...document, glue}
  expect(parseDocument(JSON.stringify(input)).ok).toBe(false)
  const sequential = {...input, glueComposition: 'sequential' as const}
  expect(parseDocument(serializeDocument(sequential))).toEqual({document: sequential, ok: true})
  expect(parseDocument(JSON.stringify({...input, glueComposition: 'unknown'})).ok).toBe(false)
})
