/** @vitest-environment node */
import {expect, test, vi} from 'vitest'
import {createEmptyDocument, parseDocumentStream, serializeDocument} from '..'

test('should restore the full document and release the input stream', async () => {
  const document = createEmptyDocument()
  const source = new Blob([serializeDocument(document)]).stream()
  expect(await parseDocumentStream({source})).toEqual({document, ok: true})
  expect(source.locked).toBe(false)
})

test('should reject invalid JSON and cancel the still-open input', async () => {
  const cancel = vi.fn()
  const source = new ReadableStream<Uint8Array>({
    cancel,
    start(controller) {
      controller.enqueue(new TextEncoder().encode('!'))
    },
  })
  expect(await parseDocumentStream({source})).toEqual({error: {code: 'invalid-json'}, ok: false})
  expect(cancel).toHaveBeenCalledOnce()
  expect(source.locked).toBe(false)
})

test('should cancel active reading and preserve the caller cancellation reason', async () => {
  const cancel = vi.fn()
  const source = new ReadableStream<Uint8Array>({cancel})
  const controller = new AbortController()
  const pending = parseDocumentStream({signal: controller.signal, source})
  const reason = new SyntaxError('cancelled by caller')
  controller.abort(reason)
  await expect(pending).rejects.toBe(reason)
  expect(cancel).toHaveBeenCalledOnce()
  expect(source.locked).toBe(false)
})
