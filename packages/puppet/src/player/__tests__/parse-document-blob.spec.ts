/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument, parseDocumentBlob, serializeDocument} from '..'

afterEach(() => vi.restoreAllMocks())
const streamedBlob = (stream: ReadableStream<Uint8Array<ArrayBuffer>>) => {
  const blob = new Blob([])
  vi.spyOn(blob, 'size', 'get').mockReturnValue(20_000_000)
  vi.spyOn(blob, 'stream').mockReturnValue(stream)
  vi.spyOn(blob, 'text').mockRejectedValue(new Error('Full text conversion must not be used'))
  return blob
}

test('should parse small files and preserve a UTF-8 byte order mark', async () => {
  const document = createEmptyDocument()
  expect(
    await parseDocumentBlob({source: new Blob(['\uFEFF', serializeDocument(document)])}),
  ).toEqual({document, ok: true})
})

test('should stream large files and preserve Unicode across byte boundaries', async () => {
  const document = {
    ...createEmptyDocument(),
    motions: [{duration: 1, id: '한글🐈\n"\\', tracks: []}],
  }
  const bytes = new TextEncoder().encode(`\uFEFF${serializeDocument(document)}`)
  let index = 0
  const source = streamedBlob(
    new ReadableStream({
      pull(controller) {
        if (index === bytes.length) {
          controller.close()
        } else {
          controller.enqueue(bytes.subarray(index, index + 1))
          index += 1
        }
      },
    }),
  )
  expect(await parseDocumentBlob({source})).toEqual({document, ok: true})
})

test.each(['{', '[1,]', '{"parts":"invalid"}'])('should report invalid input %s', async (text) => {
  const expected = text === '{"parts":"invalid"}' ? 'invalid-document' : 'invalid-json'
  const source = streamedBlob(new Blob([text]).stream())
  expect(await parseDocumentBlob({source})).toEqual({error: {code: expected}, ok: false})
})

test('should reject a file read error', async () => {
  const error = new Error('read failed')
  const source = streamedBlob(
    new ReadableStream({
      start(controller) {
        controller.error(error)
      },
    }),
  )
  await expect(parseDocumentBlob({source})).rejects.toBe(error)
})

test('should cancel a pending stream when the caller aborts', async () => {
  const cancelled = vi.fn()
  const source = streamedBlob(new ReadableStream({cancel: cancelled}))
  const controller = new AbortController()
  const pending = parseDocumentBlob({signal: controller.signal, source})
  const reason = new Error('cancelled')
  controller.abort(reason)
  await expect(pending).rejects.toBe(reason)
  expect(cancelled).toHaveBeenCalledOnce()
})

test('should reject a truncated document without returning its partially parsed fields', async () => {
  const text = serializeDocument(createEmptyDocument()).slice(0, -1)
  const source = streamedBlob(new Blob([text]).stream())
  expect(await parseDocumentBlob({source})).toEqual({error: {code: 'invalid-json'}, ok: false})
})

test('should preserve a syntax-error cancellation reason instead of reporting invalid JSON', async () => {
  const source = streamedBlob(new ReadableStream())
  const controller = new AbortController()
  const pending = parseDocumentBlob({signal: controller.signal, source})
  const reason = new SyntaxError('caller cancelled')
  controller.abort(reason)
  await expect(pending).rejects.toBe(reason)
})

test('should settle cancellation before a pending small-file text read finishes', async () => {
  const source = new Blob([])
  let finish: (value: string) => void = () => undefined
  const reading = new Promise<string>((resolve) => {
    finish = resolve
  })
  vi.spyOn(source, 'text').mockReturnValue(reading)
  const controller = new AbortController()
  const reason = new Error('cancelled before disk read completes')
  let rejected: unknown
  const pending = parseDocumentBlob({signal: controller.signal, source}).catch((error) => {
    rejected = error
  })
  controller.abort(reason)
  try {
    await expect.poll(() => rejected, {interval: 1, timeout: 50}).toBe(reason)
  } finally {
    finish('{}')
    await pending
  }
})

test('should remove its abort listener on cancellation and consume a late read failure', async () => {
  const source = new Blob([])
  let fail: (error: Error) => void = () => undefined
  const reading = new Promise<string>((_, reject) => {
    fail = reject
  })
  vi.spyOn(source, 'text').mockReturnValue(reading)
  const controller = new AbortController()
  const remove = vi.spyOn(controller.signal, 'removeEventListener')
  const pending = parseDocumentBlob({signal: controller.signal, source})
  const reason = new Error('cancelled')
  controller.abort(reason)
  fail(new Error('late native read failure'))
  await expect(pending).rejects.toBe(reason)
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
})
