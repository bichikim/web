import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerPort} from '../types'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import {useOpenFile} from '../use-open-file'

describe('useOpenFile', () => {
  let dispose: () => void
  const receive = vi.fn()
  const report = vi.fn()
  const mount = (port: ViewerPort) =>
    createRoot((cleanup) => {
      dispose = cleanup
      return useOpenFile(port, receive, report)
    })
  afterEach(() => {
    dispose()
    vi.clearAllMocks()
  })

  it('should open the first file without requiring an existing session', async () => {
    const session = {
      document: {
        lines: [],
        location: {column: 1, line: 1, path: 'src/main.tsx'},
        revision: 'revision',
        source: 'export {}',
      },
      session: 'session',
      workspace: '/project',
    }
    const call = vi.fn(async () => ({content: [], structuredContent: session}))
    const port: ViewerPort = {call, context: async () => {}, start: async () => () => {}}
    expect(await mount(port).open('/project/src/main.tsx')).toBe(true)
    expect(call).toHaveBeenCalledWith('code.open', {path: '/project/src/main.tsx'})
    expect(receive).toHaveBeenCalledWith(session)
  })

  it('should report a failed open without replacing the current session', async () => {
    const port: ViewerPort = {
      call: async () => ({content: [], isError: true, structuredContent: {code: 'not-found'}}),
      context: async () => {},
      start: async () => () => {},
    }
    expect(await mount(port).open('/project/missing.ts')).toBe(false)
    expect(receive).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledOnce()
  })

  it('should close a session created by an open superseded by a newer request', async () => {
    const first = Promise.withResolvers<CallToolResult>()
    const session = {
      document: {
        lines: [],
        location: {column: 1, line: 1, path: 'main.tsx'},
        revision: 'revision',
        source: '',
      },
      session: 'new',
      workspace: '/project',
    }
    const call = vi.fn(async (_name: string, input: Record<string, unknown>) =>
      input.path === '/project/old.tsx' ? first.promise : {content: [], structuredContent: session},
    )
    const port: ViewerPort = {call, context: async () => {}, start: async () => () => {}}
    const opener = mount(port)
    const previous = opener.open('/project/old.tsx')
    await opener.open('/project/new.tsx')
    first.resolve({content: [], structuredContent: {...session, session: 'old'}})
    expect(await previous).toBe(false)
    expect(receive).toHaveBeenCalledOnce()
    expect(call).toHaveBeenCalledWith('code.close', {session: 'old'})
  })
})
