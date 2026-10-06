/** @vitest-environment jsdom */
import {App} from '@modelcontextprotocol/ext-apps'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import {createHost} from '../create-host'
import {useViewer} from '../use-viewer'

describe('createHost', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should accumulate precise locations in addition order for concurrent additions', async () => {
    const first = Promise.withResolvers<{}>()
    const update = vi
      .spyOn(App.prototype, 'updateModelContext')
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({})
    const port = createHost()
    const addingFirst = port.context({
      column: 3,
      endColumn: 7,
      endLine: 5,
      line: 5,
      path: '/project/main.ts',
    })
    const addingSecond = port.context({
      column: 1,
      endColumn: 4,
      endLine: 12,
      line: 10,
      path: '/project/other.ts',
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(update).toHaveBeenCalledOnce()
    first.resolve({})
    await Promise.all([addingFirst, addingSecond])
    expect(update).toHaveBeenLastCalledWith({
      content: [
        {text: 'The user selected /project/main.ts:5:3-5:7 in Code Viewer.', type: 'text'},
        {text: 'The user selected /project/other.ts:10:1-12:4 in Code Viewer.', type: 'text'},
      ],
    })
  })

  it('should report a failed addition and let the next addition retain earlier successful locations', async () => {
    const failure = new Error('update failed')
    const update = vi
      .spyOn(App.prototype, 'updateModelContext')
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({})
    const port = createHost()
    await port.context({column: 1, endLine: 1, line: 1, path: '/project/first.ts'})
    await expect(
      port.context({column: 1, endLine: 2, line: 2, path: '/project/failed.ts'}),
    ).rejects.toBe(failure)
    await port.context({column: 1, endLine: 3, line: 3, path: '/project/third.ts'})
    expect(update).toHaveBeenLastCalledWith({
      content: [
        {text: 'The user selected /project/first.ts:1:1 in Code Viewer.', type: 'text'},
        {text: 'The user selected /project/third.ts:3:1 in Code Viewer.', type: 'text'},
      ],
    })
  })

  it('should clear accumulated locations when the host consumes or removes the pending context', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'openai/modelContext': {}},
    })
    const host = vi
      .spyOn(App.prototype, 'getHostContext')
      .mockReturnValue({'openai/modelContext': null})
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const update = vi.spyOn(App.prototype, 'updateModelContext').mockResolvedValue({})
    const port = createHost()
    const stop = await port.start(vi.fn(), vi.fn(), vi.fn())
    await port.context({column: 1, endLine: 1, line: 1, path: '/project/first.ts'})
    host.mockReturnValue({
      'openai/modelContext': {
        content: [{text: 'The user selected /project/first.ts:1:1 in Code Viewer.', type: 'text'}],
        updateId: 'first',
      },
    })
    const notify = () =>
      listeners.mock.calls
        .filter(([event]) => event === 'hostcontextchanged')
        .forEach(([, listener]) => listener({}))
    notify()
    host.mockReturnValue({'openai/modelContext': null})
    notify()
    await port.context({column: 1, endLine: 2, line: 2, path: '/project/next.ts'})
    expect(update).toHaveBeenLastCalledWith({
      content: [{text: 'The user selected /project/next.ts:2:1 in Code Viewer.', type: 'text'}],
    })
    await stop()
  })

  it('should remove listeners and close the transport when initialization fails', async () => {
    const error = new Error('connection failed')
    vi.spyOn(App.prototype, 'connect').mockRejectedValue(error)
    const close = vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const removed = vi.spyOn(App.prototype, 'removeEventListener')
    const port = createHost()
    await expect(port.start(vi.fn(), vi.fn(), vi.fn())).rejects.toBe(error)
    expect(removed).toHaveBeenCalledWith('toolinput', expect.any(Function))
    expect(removed).toHaveBeenCalledWith('toolresult', expect.any(Function))
    expect(close).toHaveBeenCalledOnce()
  })

  it('should close a discarded session before closing the transport after unmount', async () => {
    const opened = Promise.withResolvers<CallToolResult>()
    const sessionClosed = Promise.withResolvers<CallToolResult>()
    const connected = Promise.withResolvers<void>()
    const transportClosed = Promise.withResolvers<void>()
    vi.spyOn(App.prototype, 'connect').mockImplementation(async () => connected.resolve())
    const close = vi.spyOn(App.prototype, 'close').mockImplementation(async () => {
      transportClosed.resolve()
    })
    const call = vi
      .spyOn(App.prototype, 'callServerTool')
      .mockImplementation(({name}) =>
        name === 'code.open' ? opened.promise : sessionClosed.promise,
      )
    const port = createHost()
    const root = createRoot((dispose) => ({dispose, viewer: useViewer(port)}))
    await connected.promise
    const opening = root.viewer.open('/project/main.tsx')
    root.dispose()
    expect(close).not.toHaveBeenCalled()
    opened.resolve({
      content: [],
      structuredContent: {
        document: {
          lines: [[]],
          location: {column: 1, line: 1, path: 'main.tsx'},
          revision: '',
          source: '',
        },
        session: 'discarded',
        workspace: '/project',
      },
    })
    await opened.promise
    await Promise.resolve()
    expect(close).not.toHaveBeenCalled()
    sessionClosed.resolve({content: []})
    await opening
    await transportClosed.promise
    expect(call).toHaveBeenCalledWith({arguments: {session: 'discarded'}, name: 'code.close'})
    expect(root.viewer.session()).toBeNull()
    expect(close).toHaveBeenCalledOnce()
  })
})
