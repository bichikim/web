/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {readFileAsArrayBuffer} from '../read-file-as-array-buffer'

afterEach(() => vi.restoreAllMocks())

describe('readFileAsArrayBuffer', () => {
  it('should read actual Blob bytes and allow the reader to be reused', async () => {
    const reader = new FileReader()
    const first = await readFileAsArrayBuffer(reader, new Blob([new Uint8Array([1, 2, 255])]))
    const second = await readFileAsArrayBuffer(reader, new Blob([new Uint8Array([3])]))

    expect(new Uint8Array(first)).toEqual(new Uint8Array([1, 2, 255]))
    expect(new Uint8Array(second)).toEqual(new Uint8Array([3]))
  })

  it('should reject when the caller aborts an active read', async () => {
    const reader = new FileReader()
    const reading = readFileAsArrayBuffer(reader, new Blob(['bytes']))
    reader.abort()

    await expect(reading).rejects.toMatchObject({
      message: 'Blob reading was aborted.',
      name: 'AbortError',
    })
  })

  it.each([
    undefined,
    {invalidResult: 'Custom invalid result.', readFailed: 'Custom read failure.'},
  ])('should preserve or wrap the original reader error with messages %j', async (messages) => {
    const reader = new FileReader()
    const failure = new DOMException('unreadable', 'NotReadableError')
    Object.defineProperty(reader, 'error', {value: failure})
    vi.spyOn(reader, 'readAsArrayBuffer').mockImplementation(() => {
      reader.dispatchEvent(new ProgressEvent('error'))
    })

    const reading = readFileAsArrayBuffer(reader, new Blob(), messages)
    if (messages === undefined) {
      await expect(reading).rejects.toBe(failure)
    } else {
      await expect(reading).rejects.toMatchObject({cause: failure, message: messages.readFailed})
    }
  })

  it('should supply a default error when the reader has no error detail', async () => {
    const reader = new FileReader()
    vi.spyOn(reader, 'readAsArrayBuffer').mockImplementation(() => {
      reader.dispatchEvent(new ProgressEvent('error'))
    })

    await expect(readFileAsArrayBuffer(reader, new Blob())).rejects.toThrow('Failed to read blob.')
  })

  it.each([
    undefined,
    {invalidResult: 'Custom invalid result.', readFailed: 'Custom read failure.'},
  ])('should reject a non-buffer result with messages %j', async (messages) => {
    const reader = new FileReader()
    vi.spyOn(reader, 'readAsArrayBuffer').mockImplementation(() => {
      reader.dispatchEvent(new ProgressEvent('load'))
    })

    await expect(readFileAsArrayBuffer(reader, new Blob(), messages)).rejects.toThrow(
      messages?.invalidResult ?? 'Expected blob bytes as an ArrayBuffer.',
    )
  })

  it.each(['load', 'error', 'abort', 'throw'])(
    'should release its listeners after %s without removing caller listeners',
    async (completion) => {
      const reader = new FileReader()
      const callerListener = vi.fn()
      reader.addEventListener('load', callerListener)
      const addListener = vi.spyOn(reader, 'addEventListener')
      vi.spyOn(reader, 'readAsArrayBuffer').mockImplementation(() => {
        if (completion === 'throw') {
          throw new DOMException('busy', 'InvalidStateError')
        }
        Object.defineProperty(reader, 'result', {value: new ArrayBuffer(1)})
        reader.dispatchEvent(new ProgressEvent(completion))
      })

      const reading = readFileAsArrayBuffer(reader, new Blob())
      if (completion === 'load') {
        await expect(reading).resolves.toBe(reader.result)
      } else {
        await expect(reading).rejects.toMatchObject({
          name:
            completion === 'abort'
              ? 'AbortError'
              : completion === 'throw'
                ? 'InvalidStateError'
                : 'Error',
        })
      }
      for (const [, , options] of addListener.mock.calls) {
        expect(typeof options === 'object' && options.signal?.aborted).toBe(true)
      }
      callerListener.mockClear()
      reader.dispatchEvent(new ProgressEvent('load'))
      expect(callerListener).toHaveBeenCalledOnce()
    },
  )
})
