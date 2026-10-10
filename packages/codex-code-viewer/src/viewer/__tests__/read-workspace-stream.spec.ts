import {afterEach, describe, expect, it, vi} from 'vitest'
import {readWorkspaceStream} from '../read-workspace-stream'

const batch = {
  complete: true,
  directories: [],
  directory: '',
  files: [{openable: true, path: '한글.ts'}],
}
const setup = () => {
  const output = new TransformStream<Uint8Array, Uint8Array>()
  const writer = output.writable.getWriter()
  const fetch = vi.fn().mockResolvedValue(new Response(output.readable))
  vi.stubGlobal('fetch', fetch)
  const call = vi
    .fn()
    .mockResolvedValue({content: [], structuredContent: {url: 'http://127.0.0.1:4321/scan/token'}})
  return {call, fetch, writer}
}

describe('readWorkspaceStream', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('should deliver MCP batches before completion without making a browser network request', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const finished = Promise.withResolvers<unknown>()
    const received = Promise.withResolvers<void>()
    const call = vi
      .fn()
      .mockResolvedValueOnce({content: [], structuredContent: {url: 'code-viewer://scan/token'}})
      .mockResolvedValueOnce({content: [], structuredContent: {batch, done: false}})
      .mockImplementationOnce(() => finished.promise)
      .mockResolvedValue({content: [], structuredContent: {closed: true}})
    const receive = vi.fn(() => received.resolve())
    const operation = readWorkspaceStream({
      input: {},
      name: 'code.tree',
      port: {call},
      receive,
      signal: new AbortController().signal,
    })
    await received.promise
    expect(receive).toHaveBeenCalledWith(batch)
    expect(fetch).not.toHaveBeenCalled()
    finished.resolve({content: [], structuredContent: {done: true}})
    await operation
    expect(call).toHaveBeenCalledWith('code.stream.read', {url: 'code-viewer://scan/token'})
    expect(call).toHaveBeenCalledWith('code.stream.close', {url: 'code-viewer://scan/token'})
  })
  it('should deliver split UTF-8 batches before completion and recognize the terminal message', async () => {
    const {call, writer} = setup()
    const received = Promise.withResolvers<void>()
    const receive = vi.fn(() => received.resolve())
    const operation = readWorkspaceStream({
      input: {session: 'session'},
      name: 'code.tree',
      port: {call},
      receive,
      signal: new AbortController().signal,
    })
    const bytes = new TextEncoder().encode(`${JSON.stringify(batch)}\n`)
    await writer.write(bytes.slice(0, bytes.length - 9))
    expect(receive).not.toHaveBeenCalled()
    await writer.write(bytes.slice(bytes.length - 9))
    await received.promise
    expect(receive).toHaveBeenCalledWith(batch)
    await writer.write(new TextEncoder().encode('{"done":true}\n'))
    await operation
  })
  it('should cancel a pending reader when aborted and stop delivering batches', async () => {
    const {call, writer, fetch} = setup()
    const received = Promise.withResolvers<void>()
    const receive = vi.fn(() => received.resolve())
    const controller = new AbortController()
    const operation = readWorkspaceStream({
      input: {},
      name: 'code.tree',
      port: {call},
      receive,
      signal: controller.signal,
    })
    const rejected = expect(operation).rejects.toThrow()
    await writer.write(new TextEncoder().encode(`${JSON.stringify(batch)}\n`))
    await received.promise
    controller.abort()
    await rejected
    expect(fetch).toHaveBeenCalledWith(expect.any(String), {signal: controller.signal})
    expect(receive).toHaveBeenCalledOnce()
  })
  it('should reject an interrupted scan instead of accepting a partial result', async () => {
    const {call, writer} = setup()
    const operation = readWorkspaceStream({
      input: {},
      name: 'code.tree',
      port: {call},
      receive: vi.fn(),
      signal: new AbortController().signal,
    })
    const rejected = expect(operation).rejects.toThrow('연결이 끊겼습니다')
    await writer.close()
    await rejected
  })
  it('should reject nonlocal endpoints without connecting', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const call = vi
      .fn()
      .mockResolvedValue({content: [], structuredContent: {url: 'https://example.com/scan'}})
    await expect(
      readWorkspaceStream({
        input: {},
        name: 'code.tree',
        port: {call},
        receive: vi.fn(),
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
})
