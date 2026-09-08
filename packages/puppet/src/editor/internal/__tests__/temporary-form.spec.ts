import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player/create-demo-document'
import {applyTemporaryForm, createTemporaryTarget, readTemporaryForm} from '../temporary-form'

test('should edit an isolated interpolated form without creating a source key', () => {
  const document = createDemoDocument()
  const binding = document.parameterBindings![0]!
  const nodeId = binding.keyforms[0]!.parts[0]!.partId
  const target = createTemporaryTarget({bindingId: binding.id, document, nodeId, values: [15, 0]})!
  expect(target.document).not.toBe(document)
  expect(document.parameterBindings![0]!.keyforms).toHaveLength(9)
  expect(target.document.parameterBindings![0]!.keyforms).toHaveLength(10)
  const form = readTemporaryForm({...target, nodeId})!
  const changed = {
    ...form,
    parts: form.parts.map((part) => ({
      ...part,
      vertices: part.vertices.map((value, index) => (index === 0 ? value + 10 : value)),
    })),
  }
  const saved = applyTemporaryForm({
    bindingId: binding.id,
    document,
    form: changed,
    nodeId,
    values: [30, 0],
  })!
  expect(saved.parameterBindings![0]!.keyforms).toHaveLength(9)
  expect(saved.parts).toBe(document.parts)
  expect(
    saved.parameterBindings![0]!.keyforms.find(
      (key) => key.values[0] === 30 && key.values[1] === 0,
    )!.parts[0]!.vertices,
  ).toEqual(changed.parts[0]!.vertices)
  expect(document.parameterBindings![0]!.keyforms).toHaveLength(9)
})

test('should isolate an unbound part and reject saving to an unrelated keyform', () => {
  const document = createDemoDocument()
  const nodeId = 'shape-diamond'
  const target = createTemporaryTarget({document, nodeId, values: [0]})!
  const form = readTemporaryForm({...target, nodeId})!
  expect(form.parts.map((part) => part.partId)).toEqual([nodeId])
  expect(target.document.parameterBindings).toHaveLength(document.parameterBindings!.length + 1)
  expect(
    applyTemporaryForm({
      bindingId: document.parameterBindings![0]!.id,
      document,
      form,
      nodeId,
      values: [0, 0],
    }),
  ).toBeUndefined()
})
