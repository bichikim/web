import {expect, test} from 'vitest'
import {createDemoDocument, parseDocumentBlob, serializeDocument} from '@winter-love/puppet/player'
import {serializeNodeDocumentFile} from '../serialize-document-file'

test('should preserve the complete model and texture bytes through native Brotli and the common reader', async () => {
  const document = createDemoDocument()
  const before = serializeDocument(document)
  const content = await serializeNodeDocumentFile(document, 'poffo')
  const result = await parseDocumentBlob({source: content})
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  expect(serializeDocument(result.document)).toBe(before)
  expect(serializeDocument(document)).toBe(before)
})

test('should cancel one native export without affecting a concurrent export', async () => {
  const controller = new AbortController()
  const document = createDemoDocument()
  const cancelled = serializeNodeDocumentFile(document, 'poffo', controller.signal)
  const completed = serializeNodeDocumentFile(document, 'poffo')
  controller.abort(new Error('cancelled'))
  await expect(cancelled).rejects.toBe(controller.signal.reason)
  const result = await parseDocumentBlob({source: await completed})
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.error.code)
  }
  expect(serializeDocument(result.document)).toBe(serializeDocument(document))
})
