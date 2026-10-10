import {afterEach, describe, expect, it, vi} from 'vitest'
import {createWorkspaceEvents} from '../create-workspace-events'

const batch = {complete: true, directories: ['src'], directory: '', files: []}

describe('createWorkspaceEvents', () => {
  const servers: ReturnType<typeof createWorkspaceEvents>[] = []
  const start = () => {
    const server = createWorkspaceEvents()
    servers.push(server)
    return server
  }
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.dispose()))
  })
  it('should send early batches before a scan completes and close the response when done', async () => {
    const server = start()
    const continuation = Promise.withResolvers<void>()
    const url = await server.scan('session', 'tree', async function* url() {
      yield batch
      await continuation.promise
      yield {...batch, directory: 'src', files: [{openable: true, path: 'src/main.ts'}]}
    })
    const response = await fetch(url)
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    expect((await reader.read()).value).toContain('"directories":["src"]')
    continuation.resolve()
    let remaining = ''
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- Read the next chunk only after consuming the previous chunk.
      const chunk = await reader.read()
      if (chunk.done) {
        break
      }
      remaining += chunk.value
    }
    expect(remaining).toContain('src/main.ts')
    expect(remaining).toContain('"done":true')
    expect((await fetch(url)).status).toBe(404)
  })
  it('should abort running scans when replaced and invalidate unconsumed endpoints', async () => {
    const server = start()
    const aborted = Promise.withResolvers<void>()
    const first = await server.scan('session', 'tree', async function* first(signal) {
      signal.addEventListener('abort', () => aborted.resolve(), {once: true})
      yield batch
      await aborted.promise
      signal.throwIfAborted()
    })
    const response = await fetch(first)
    const reader = response.body!.getReader()
    await reader.read()
    const second = await server.scan('session', 'tree', async function* second() {
      yield batch
    })
    await aborted.promise
    expect((await fetch(first)).status).toBe(404)
    const third = await server.scan('session', 'tree', async function* third() {
      yield batch
    })
    expect((await fetch(second)).status).toBe(404)
    server.closed('session')
    expect((await fetch(third)).status).toBe(404)
    await reader.cancel()
  })
  it('should abort discovery when the consumer disconnects', async () => {
    const server = start()
    const aborted = Promise.withResolvers<void>()
    const url = await server.scan('session', 'tree', async function* url(signal) {
      signal.addEventListener('abort', () => aborted.resolve(), {once: true})
      yield batch
      await aborted.promise
    })
    const controller = new AbortController()
    const response = await fetch(url, {signal: controller.signal})
    const reader = response.body!.getReader()
    await reader.read()
    controller.abort()
    await aborted.promise
    await reader.cancel().catch(() => undefined)
  })
  it('should report discovery errors without treating a partial result as complete', async () => {
    const server = start()
    const source = vi.fn(async function* source() {
      yield batch
      throw new Error('read denied')
    })
    const url = await server.scan('session', 'tree', source)
    const result = await (await fetch(url)).text()
    expect(result).toContain('"error":"read-failed"')
    expect(result).not.toContain('"done":true')
  })
})
