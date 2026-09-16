/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'
import {validateMp3Header} from '../validate-mp3-header'

const consume = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> =>
  new Uint8Array(await new Response(stream).arrayBuffer())

const streamChunks = (chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk))
      controller.close()
    },
  })

describe('validateMp3Header', () => {
  it('should preserve bytes with a tag header split across stream chunks', async () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 1, 0, 0xff])
    const stream = streamChunks([bytes.subarray(0, 2), bytes.subarray(2, 8), bytes.subarray(8)])
    expect(await consume(validateMp3Header(stream, bytes.length))).toEqual(bytes)
  })

  it('should preserve untagged bytes', async () => {
    const bytes = new Uint8Array([0xff, 0xfb, 0x90])
    expect(await consume(validateMp3Header(streamChunks([bytes]), bytes.length))).toEqual(bytes)
  })

  it.each([
    [0x49, 0x44, 0x33],
    [0x49, 0x44, 0x33, 4, 0, 0, 0x80, 0, 0, 0],
    [0x49, 0x44, 0x33, 4, 0, 0, 1, 64, 0, 0],
  ])('should reject a malformed or truncated tag %j', async (...values) => {
    const bytes = new Uint8Array(values)
    await expect(consume(validateMp3Header(streamChunks([bytes]), bytes.length))).rejects.toThrow(
      'invalid_mp3_id3',
    )
  })

  it('should cancel the storage stream after an invalid header', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      cancel,
      start(controller) {
        controller.enqueue(new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 1, 64, 0, 0]))
      },
    })
    await expect(consume(validateMp3Header(stream, 10))).rejects.toThrow('invalid_mp3_id3')
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce())
  })

  it('should preserve a storage stream error', async () => {
    const error = new Error('Storage connection lost')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(error)
      },
    })
    await expect(consume(validateMp3Header(stream, 100))).rejects.toBe(error)
  })
})
