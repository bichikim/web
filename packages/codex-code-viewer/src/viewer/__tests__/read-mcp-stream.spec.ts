import {describe, expect, it, vi} from 'vitest'
import {z} from 'zod'
import {readMcpStream} from '../read-mcp-stream'

describe('readMcpStream', () => {
  it('should close an in-flight cursor immediately when cancellation arrives', async () => {
    const pending = Promise.withResolvers<{content: []; structuredContent: {done: true}}>()
    const started = Promise.withResolvers<void>()
    const call = vi.fn(async (name: string) => {
      if (name === 'code.stream.close') {
        pending.resolve({content: [], structuredContent: {done: true}})
        return {content: [], structuredContent: {closed: true}}
      }
      started.resolve()
      return pending.promise
    })
    const controller = new AbortController()
    const receive = vi.fn()
    const reading = readMcpStream({
      call,
      receive,
      schema: z.object({value: z.string()}),
      signal: controller.signal,
      url: 'code-viewer://scan/token',
    })
    const rejected = expect(reading).rejects.toThrow()
    await started.promise
    controller.abort()
    await rejected
    expect(receive).not.toHaveBeenCalled()
    expect(call).toHaveBeenCalledWith('code.stream.close', {url: 'code-viewer://scan/token'})
    expect(call).toHaveBeenCalledTimes(2)
  })
  it('should close an endpoint even when cancellation arrived before its first read', async () => {
    const controller = new AbortController()
    controller.abort()
    const call = vi.fn().mockResolvedValue({content: []})
    await expect(
      readMcpStream({
        call,
        receive: vi.fn(),
        schema: z.object({}),
        signal: controller.signal,
        url: 'code-viewer://scan/token',
      }),
    ).rejects.toThrow()
    expect(call).toHaveBeenCalledExactlyOnceWith('code.stream.close', {
      url: 'code-viewer://scan/token',
    })
  })
  it.each([
    {content: [], isError: true, structuredContent: {code: 'read-failed'}},
    {content: [], structuredContent: {batch: {value: 123}, done: false}},
  ])('should release cursors after a failed or malformed batch', async (result) => {
    const call = vi.fn().mockResolvedValueOnce(result).mockResolvedValue({content: []})
    const receive = vi.fn()
    await expect(
      readMcpStream({
        call,
        receive,
        schema: z.object({value: z.string()}),
        signal: new AbortController().signal,
        url: 'code-viewer://scan/token',
      }),
    ).rejects.toThrow()
    expect(receive).not.toHaveBeenCalled()
    expect(call).toHaveBeenLastCalledWith('code.stream.close', {url: 'code-viewer://scan/token'})
  })
})
