/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readBlobAsArrayBuffer} from '..'

afterEach(() => vi.restoreAllMocks())

const createFallbackBlob = (parts: BlobPart[] = []) => {
  const blob = new Blob(parts)
  Object.defineProperty(blob, 'arrayBuffer', {value: undefined})
  return blob
}

describe('readBlobAsArrayBuffer', () => {
  it('should prefer the native reader and propagate its failures without falling back', async () => {
    const blob = new Blob(['bytes'])
    const bytes = new ArrayBuffer(4)
    const failure = new Error('read failed')
    const arrayBuffer = vi.fn().mockResolvedValueOnce(bytes).mockRejectedValueOnce(failure)
    Object.defineProperty(blob, 'arrayBuffer', {value: arrayBuffer})
    const fallback = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer')
    const messages = {invalidResult: 'Invalid bytes.', readFailed: 'Read failed.'}

    await expect(readBlobAsArrayBuffer(blob, messages)).resolves.toBe(bytes)
    await expect(readBlobAsArrayBuffer(blob, messages)).rejects.toBe(failure)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('should read actual bytes through FileReader when the native method is unavailable', async () => {
    const blob = createFallbackBlob([Uint8Array.of(1, 2, 255)])
    const fallback = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer')

    expect(new Uint8Array(await readBlobAsArrayBuffer(blob))).toEqual(Uint8Array.of(1, 2, 255))
    expect(fallback).toHaveBeenCalledExactlyOnceWith(blob)
  })

  it.each([undefined, {invalidResult: 'Invalid bytes.', readFailed: 'Read failed.'}])(
    'should preserve the FileReader failure policy with messages %j',
    async (messages) => {
      const failure = new DOMException('unreadable', 'NotReadableError')
      vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(
        function fail(this: FileReader) {
          Object.defineProperty(this, 'error', {value: failure})
          this.dispatchEvent(new ProgressEvent('error'))
        },
      )
      const reading = readBlobAsArrayBuffer(createFallbackBlob(), messages)
      if (messages === undefined) {
        await expect(reading).rejects.toBe(failure)
      } else {
        await expect(reading).rejects.toMatchObject({cause: failure, message: messages.readFailed})
      }
    },
  )

  it.each([undefined, {invalidResult: 'Invalid bytes.', readFailed: 'Read failed.'}])(
    'should preserve the invalid-result policy with messages %j',
    async (messages) => {
      vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(
        function load(this: FileReader) {
          this.dispatchEvent(new ProgressEvent('load'))
        },
      )
      await expect(readBlobAsArrayBuffer(createFallbackBlob(), messages)).rejects.toThrow(
        messages?.invalidResult ?? 'Expected blob bytes as an ArrayBuffer.',
      )
    },
  )

  it('should expose the FileReader abort reason through the fallback', async () => {
    vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(
      function abort(this: FileReader) {
        this.dispatchEvent(new ProgressEvent('abort'))
      },
    )
    await expect(readBlobAsArrayBuffer(createFallbackBlob())).rejects.toMatchObject({
      message: 'Blob reading was aborted.',
      name: 'AbortError',
    })
  })
})
