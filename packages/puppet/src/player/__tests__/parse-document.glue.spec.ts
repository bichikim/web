import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../index'
import {addGlue, setGlueKeyform} from '../../editor/internal/glue'

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
