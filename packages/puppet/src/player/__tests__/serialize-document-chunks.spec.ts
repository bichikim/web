import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument, serializeDocumentChunks} from '..'

afterEach(() => vi.restoreAllMocks())

test('should preserve the existing JSON formatting, normalization and texture deduplication', () => {
  const document = createDemoDocument()
  const source = {
    ...document,
    parts: document.parts.map((part) => ({...part, texture: document.parts[0]!.texture})),
  }
  const before = structuredClone(source)
  const json = [...serializeDocumentChunks(source)].join('')
  expect(json).toBe(serializeDocument(source))
  expect(parseDocument(json)).toEqual({document: source, ok: true})
  expect(source).toEqual(before)
})

test('should yield multiple chunks and preserve Unicode and escaped text exactly', () => {
  const document = createDemoDocument()
  const source = {
    ...document,
    motions: document.motions.map((motion) => ({
      ...motion,
      id: `${motion.id}한글🐈\n"\\${'x'.repeat(20000)}`,
    })),
  }
  const chunks = [...serializeDocumentChunks(source)]
  expect(chunks.length).toBeGreaterThan(1)
  expect(chunks.join('')).toBe(serializeDocument(source))
})

test('should serialize without asking JSON.stringify to materialize a document object', () => {
  const document = createDemoDocument()
  const expected = serializeDocument(document)
  const stringify = JSON.stringify
  vi.spyOn(JSON, 'stringify').mockImplementation((value, replacer, space) => {
    if (typeof value === 'object' && value !== null) {
      throw new RangeError('Invalid string length')
    }
    return stringify(value, replacer, space)
  })
  expect([...serializeDocumentChunks(document)].join('')).toBe(expected)
})
