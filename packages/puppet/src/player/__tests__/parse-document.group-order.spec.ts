import {expect, test} from 'vitest'
import {createIsolatedOrderDocument} from '../internal/__tests__/fixtures/isolated-order'
import {parseDocumentValue} from '../parse-document'

test('should accept static isolated groups with keyed draw orders and no explicit rest order', () => {
  expect(parseDocumentValue(createIsolatedOrderDocument(true)).ok).toBe(true)
})

test.each([true, false])('should accept boolean isolateOrder=%s', (isolateOrder) => {
  const document = createIsolatedOrderDocument(false)
  expect(
    parseDocumentValue({
      ...document,
      scene: {
        roots: document.scene!.roots.map((node) =>
          node.kind === 'group' ? {...node, properties: {isolateOrder}} : node,
        ),
      },
    }).ok,
  ).toBe(true)
})

test.each([1, 'true', null])('should reject nonboolean isolateOrder=%s', (isolateOrder) => {
  const document = createIsolatedOrderDocument(false)
  expect(
    parseDocumentValue({
      ...document,
      scene: {
        roots: document.scene!.roots.map((node) =>
          node.kind === 'group' ? {...node, properties: {isolateOrder}} : node,
        ),
      },
    }).ok,
  ).toBe(false)
})

test('should reject isolateOrder as an animated channel', () => {
  const source = createIsolatedOrderDocument(true)
  expect(
    parseDocumentValue({
      ...source,
      parameterBindings: source.parameterBindings!.map((binding) => ({
        ...binding,
        keyforms: binding.keyforms.map((form) => ({
          ...form,
          groups: form.groups!.map((group) => ({...group, properties: {isolateOrder: true}})),
        })),
      })),
    }).ok,
  ).toBe(false)
})
