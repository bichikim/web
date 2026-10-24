/** @vitest-environment jsdom */
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import {App} from '@modelcontextprotocol/ext-apps'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {createHost} from '../create-host'
import {useViewer} from '../use-viewer'
import {initial} from './fixtures/viewer'

describe('createHost', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should serialize tree writes and finish them before closing the host', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    const close = vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const setter = vi.spyOn(App.prototype, 'onteardown', 'set')
    const blocked = Promise.withResolvers<{content: []; structuredContent: {visible: boolean}}>()
    const started = Promise.withResolvers<void>()
    const call = vi
      .spyOn(App.prototype, 'callServerTool')
      .mockImplementationOnce(() => {
        started.resolve()
        return blocked.promise
      })
      .mockResolvedValue({content: [], structuredContent: {expanded: []}})
    const host = createHost()
    expect(createHost({integration: 'standard'}).saveTreeState).toBeUndefined()
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    const first = host.saveTreeState?.('one', {visible: false})
    const second = host.saveTreeState?.('one', {expanded: []})
    const closingSession = host.call('code.close', {session: 'one'})
    const teardown = setter.mock.calls[0][0]?.(
      {},
      {
        requestId: 'teardown',
        sendNotification: vi.fn(),
        sendRequest: vi.fn(),
        signal: new AbortController().signal,
      },
    )
    const closing = stop()
    await started.promise
    expect(call).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
    blocked.resolve({content: [], structuredContent: {visible: false}})
    await Promise.all([first, second, closingSession, closing, teardown])
    expect(call.mock.calls.map(([input]) => input)).toEqual([
      {arguments: {patch: {visible: false}, session: 'one'}, name: 'code.tree-state'},
      {arguments: {patch: {expanded: []}, session: 'one'}, name: 'code.tree-state'},
      {arguments: {session: 'one'}, name: 'code.close'},
    ])
    expect(close).toHaveBeenCalledOnce()
  })

  it('should attach through the current Browser session only when native composer integration is enabled', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    expect(createHost({composerAttachment: true}).attachContextFiles).toBeUndefined()
    const host = createHost({composerAttachment: true, integration: 'standard'})
    await expect(host.attachContextFiles?.()).rejects.toThrow('파일을 먼저')
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener({structuredContent: {...initial}}))
    await host.attachContextFiles?.()
    expect(call).toHaveBeenCalledWith({
      arguments: {session: initial.session},
      name: 'code.attach-to-composer',
    })
    call.mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'composer-target-missing'},
    })
    await expect(host.attachContextFiles?.()).rejects.toThrow('이 뷰어가 열린 Claude Code 세션')
    await stop()
  })

  it('should expose native file copy only for an enabled standard host and its current session', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    expect(createHost().copyContextFiles).toBeUndefined()
    expect(createHost({integration: 'standard'}).copyContextFiles).toBeUndefined()
    const host = createHost({fileClipboard: true, integration: 'standard'})
    await expect(host.copyContextFiles?.()).rejects.toThrow('파일을 먼저')
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener({structuredContent: {...initial}}))
    await host.copyContextFiles?.()
    expect(call).toHaveBeenCalledWith({
      arguments: {session: initial.session},
      name: 'code.copy-attachments',
    })
    call.mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'clipboard-unavailable'},
    })
    await expect(host.copyContextFiles?.()).rejects.toThrow('클립보드')
    await stop()
  })

  it('should attach a selected file directly without staging it or changing model context', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    const update = vi.spyOn(App.prototype, 'updateModelContext')
    const host = createHost({composerAttachment: true, integration: 'standard'})
    const receive = vi.fn()
    host.subscribeContext?.(receive)
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener({structuredContent: {...initial}}))
    await host.attachSelection?.({kind: 'file', path: '/project/original.ts'})
    expect(call).toHaveBeenCalledExactlyOnceWith({
      arguments: {
        attachment: {kind: 'file', path: '/project/original.ts'},
        session: initial.session,
      },
      name: 'code.attach-to-composer',
    })
    expect(update).not.toHaveBeenCalled()
    expect(receive).toHaveBeenLastCalledWith([])
    await stop()
  })

  it('should clear pending snapshots only after a native card is confirmed', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    vi.spyOn(App.prototype, 'updateModelContext').mockResolvedValue({})
    const host = createHost({composerAttachment: true, integration: 'standard'})
    const receive = vi.fn()
    host.subscribeContext?.(receive)
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener({structuredContent: {...initial}}))
    await host.context({
      column: 1,
      endLine: 1,
      kind: 'code',
      line: 1,
      path: '/project/main.ts',
      text: 'pending draft',
    })
    call.mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'composer-target-missing'},
    })
    await expect(host.attachContextFiles?.()).rejects.toThrow()
    expect(receive).toHaveBeenLastCalledWith([expect.stringContaining('pending draft')])
    await host.attachContextFiles?.()
    expect(receive).toHaveBeenLastCalledWith([])
    await stop()
  })

  it.each([false, true])('should honor Browser restoreView=%s metadata', async (restoreView) => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const receive = vi.fn()
    const host = createHost({integration: 'standard'})
    const stop = await host.start(receive, vi.fn(), vi.fn())
    const result = {
      _meta: {'winter-love/code-viewer/navigation': {restoreView}},
      structuredContent: {...initial},
    }
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener(result))
    expect(receive).toHaveBeenCalledWith(result.structuredContent, {restoreView})
    await stop()
  })

  it('should attach standard file context and clear it without sending a message', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({})
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({
      content: [{text: '/project/main.ts\nexport const answer = 42', type: 'text'}],
    })
    const update = vi.spyOn(App.prototype, 'updateModelContext').mockResolvedValue({})
    const send = vi.spyOn(App.prototype, 'sendMessage')
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const host = createHost({integration: 'standard'})
    const receive = vi.fn()
    host.subscribeContext?.(receive)
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener({structuredContent: {...initial}}))
    await host.context({kind: 'file', path: '/project/main.ts'})
    expect(call).toHaveBeenCalledWith({arguments: {path: '/project/main.ts'}, name: 'code.context'})
    expect(update).toHaveBeenLastCalledWith({
      content: [{text: expect.stringContaining('export const answer = 42'), type: 'text'}],
    })
    expect(receive).toHaveBeenLastCalledWith([expect.stringContaining('main.ts')])
    await host.removeContext?.()
    expect(update).toHaveBeenLastCalledWith({content: []})
    expect(receive).toHaveBeenLastCalledWith([])
    expect(call).toHaveBeenLastCalledWith({
      arguments: {content: [], session: initial.session},
      name: 'code.stage-context',
    })
    expect(send).not.toHaveBeenCalled()
    await stop()
  })

  it('should publish the initial locale after connecting and subsequent host language changes', async () => {
    const context = vi.spyOn(App.prototype, 'getHostContext').mockReturnValue(undefined)
    vi.spyOn(App.prototype, 'connect').mockImplementation(async () => {
      context.mockReturnValue({locale: 'ko-KR'})
    })
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const remove = vi.spyOn(App.prototype, 'removeEventListener')
    const host = createHost()
    const receive = vi.fn()
    const unsubscribe = host.subscribeLocale?.(receive)
    expect(receive).toHaveBeenLastCalledWith(undefined)
    const stop = await host.start(vi.fn(), vi.fn(), vi.fn())
    expect(receive).toHaveBeenLastCalledWith('ko-KR')
    context.mockReturnValue({locale: 'en-US'})
    listeners.mock.calls
      .filter(([name]) => name === 'hostcontextchanged')
      .forEach(([, listener]) => listener({locale: 'en-US'}))
    expect(receive).toHaveBeenLastCalledWith('en-US')
    unsubscribe?.()
    receive.mockClear()
    context.mockReturnValue({locale: 'ja-JP'})
    listeners.mock.calls
      .filter(([name]) => name === 'hostcontextchanged')
      .forEach(([, listener]) => listener({locale: 'ja-JP'}))
    expect(receive).not.toHaveBeenCalled()
    await stop()
    expect(remove).toHaveBeenCalledWith('hostcontextchanged', expect.any(Function))
  })

  it('should attach native files and receive workspace changes without resource subscriptions', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    const closed = Promise.withResolvers<void>()
    vi.spyOn(App.prototype, 'close').mockImplementation(async () => closed.resolve())
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'openai/resource': {}},
    })
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const uri = 'codex-resource://opened/main.tsx'
    const request = vi
      .spyOn(App.prototype, 'request')
      .mockRejectedValue(new Error('MCP resource is not subscribable'))
    const waiting = Promise.withResolvers<void>()
    vi.spyOn(App.prototype, 'callServerTool').mockImplementation(async ({name}, options) => {
      if (name === 'code.attach') {
        return {content: [], structuredContent: {...initial}}
      }
      if (name === 'code.watch') {
        return {content: [], structuredContent: {revision: 0}}
      }
      if (name === 'code.watch.next') {
        waiting.resolve()
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
            once: true,
          })
        })
      }
      return {content: [], structuredContent: {document: initial.document}}
    })
    const root = createRoot((dispose) => ({dispose, viewer: useViewer(createHost())}))
    const input = listeners.mock.calls.find(([event]) => event === 'toolinput')?.[1]
    input?.({arguments: {file: {name: 'main.tsx', resourceUri: uri}}})
    await waiting.promise
    expect(root.viewer.session()?.document.location.path).toBe('main.tsx')
    expect(root.viewer.notice()).toBeNull()
    expect(request).not.toHaveBeenCalled()
    root.dispose()
    await closed.promise
    expect(request).not.toHaveBeenCalled()
  })

  it.each([{}, {experimental: {'openai/resource': {}}}])(
    'should receive workspace events without subscribing plugin resources in host %j',
    async (capabilities) => {
      vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue(capabilities)
      const request = vi
        .spyOn(App.prototype, 'request')
        .mockRejectedValue(new Error('MCP resource is not subscribable'))
      const waiting = Promise.withResolvers<void>()
      const call = vi
        .spyOn(App.prototype, 'callServerTool')
        .mockImplementation(async ({name}, options) => {
          if (name === 'code.watch') {
            return {
              content: [],
              structuredContent: {resourceUri: 'file:///tmp/workspace/revision.json', revision: 0},
            }
          }
          waiting.resolve()
          return new Promise((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), {
              once: true,
            })
          })
        })
      const receive = vi.fn()
      const report = vi.fn()
      const stop = await createHost().watch?.('first', receive, report)
      await waiting.promise
      expect(receive).toHaveBeenCalledOnce()
      expect(request).not.toHaveBeenCalled()
      expect(call).toHaveBeenCalledWith({
        arguments: {session: 'first', transport: 'mcp'},
        name: 'code.watch',
      })
      expect(call).toHaveBeenCalledWith(
        {
          arguments: {revision: 0, session: 'first'},
          name: 'code.watch.next',
        },
        expect.objectContaining({signal: expect.any(AbortSignal)}),
      )
      await stop?.()
      expect(report).not.toHaveBeenCalled()
    },
  )
  it('should request scan cursors through MCP in the installed host', async () => {
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    await createHost().call('code.tree', {session: 'first', stream: true})
    expect(call).toHaveBeenCalledWith({
      arguments: {session: 'first', stream: true, transport: 'mcp'},
      name: 'code.tree',
    })
  })
  it('should use HTTP streams when the preview explicitly advertises them', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'winter-love/code-viewer/http': {version: 1}},
    })
    const call = vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({content: []})
    await createHost().call('code.navigate', {session: 'first', stream: true})
    expect(call).toHaveBeenCalledWith({
      arguments: {session: 'first', stream: true, transport: 'http'},
      name: 'code.navigate',
    })
  })
  it('should open and close workspace events in the HTTP preview', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'winter-love/code-viewer/http': {version: 1}},
    })
    const close = vi.fn()
    const removeEventListener = vi.fn()
    const addEventListener = vi.fn()
    const source = vi.fn(function source() {
      return {addEventListener, close, removeEventListener}
    })
    vi.stubGlobal('EventSource', source)
    vi.spyOn(App.prototype, 'callServerTool').mockResolvedValue({
      content: [],
      structuredContent: {url: 'http://127.0.0.1:1234/events/first'},
    })
    try {
      const receive = vi.fn()
      const stop = await createHost().watch?.('first', receive, vi.fn())
      expect(source).toHaveBeenCalledWith('http://127.0.0.1:1234/events/first')
      const handler = addEventListener.mock.calls[0][1]
      handler(new MessageEvent('message', {data: '1'}))
      expect(receive).toHaveBeenCalledOnce()
      await stop?.()
      expect(removeEventListener).toHaveBeenCalledWith('message', handler)
      expect(close).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('should await the consumer cleanup when the host requests teardown', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({})
    const setter = vi.spyOn(App.prototype, 'onteardown', 'set')
    const cleaned = Promise.withResolvers<void>()
    const onTeardown = vi.fn(() => cleaned.promise)
    const port = createHost()
    const stop = await port.start(vi.fn(), vi.fn(), vi.fn(), onTeardown)
    const callback = setter.mock.calls[0][0]
    const completion = callback?.(
      {},
      {
        requestId: 'teardown',
        sendNotification: vi.fn(),
        sendRequest: vi.fn(),
        signal: new AbortController().signal,
      },
    )
    expect(onTeardown).toHaveBeenCalledOnce()
    cleaned.resolve()
    expect(await completion).toEqual({})
    await stop()
  })

  it('should leave native navigation untouched when the host has no location capability', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({})
    const request = vi.spyOn(App.prototype, 'request').mockResolvedValue({})
    await createHost().location?.({path: 'src/next.ts', workspace: '/project'})
    expect(request).not.toHaveBeenCalled()
  })

  it('should update the current native file tab through the advertised location capability', async () => {
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({
      experimental: {'winter-love/file-viewer/location': {version: 1}},
    })
    const request = vi.spyOn(App.prototype, 'request').mockResolvedValue({})
    await createHost().location?.({path: 'src/next.ts', workspace: '/project'})
    expect(request).toHaveBeenCalledWith(
      {
        method: 'winter-love/file-viewer/location',
        params: {path: 'src/next.ts', workspace: '/project'},
      },
      expect.anything(),
    )
  })

  it('should accumulate files, folders and code ranges in the same chat context', async () => {
    const update = vi.spyOn(App.prototype, 'updateModelContext').mockResolvedValue({})
    const port = createHost()
    await port.context({kind: 'file', path: '/project/src/my file.ts'})
    await port.context({kind: 'directory', path: '/project/src'})
    await port.context({column: 3, endColumn: 7, endLine: 5, line: 5, path: '/project/src/main.ts'})
    expect(update).toHaveBeenLastCalledWith({
      content: [
        {
          text: 'The user selected the file "/project/src/my file.ts" in Code Viewer.',
          type: 'text',
        },
        {text: 'The user selected the folder "/project/src" in Code Viewer.', type: 'text'},
        {text: 'The user selected /project/src/main.ts:5:3-5:7 in Code Viewer.', type: 'text'},
      ],
    })
  })

  it('should append the actual draft patch and baseline to existing pending chat context', async () => {
    const update = vi.spyOn(App.prototype, 'updateModelContext').mockResolvedValue({})
    const port = createHost()
    await port.context({kind: 'file', path: '/project/helper.ts'})
    const patch = '--- src/main.ts\n+++ src/main.ts\n@@ -1 +1 @@\n-before\n+after\n'
    await port.context({kind: 'changes', patch, path: '/project/src/main.ts', revision: 'baseline'})
    expect(update).toHaveBeenLastCalledWith({
      content: [
        {text: 'The user selected the file "/project/helper.ts" in Code Viewer.', type: 'text'},
        {
          text: [
            'The user attached unsaved changes to "/project/src/main.ts" in Code Viewer.',
            'Base revision (last read or saved): "baseline".',
            'This is a draft snapshot, not a disk save.',
            '',
            patch,
          ].join('\n'),
          type: 'text',
        },
      ],
    })
  })

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
  it('should receive a folder-only menu result without attaching a file resource', async () => {
    vi.spyOn(App.prototype, 'connect').mockResolvedValue()
    vi.spyOn(App.prototype, 'close').mockResolvedValue()
    vi.spyOn(App.prototype, 'getHostCapabilities').mockReturnValue({})
    const listeners = vi.spyOn(App.prototype, 'addEventListener')
    const call = vi.spyOn(App.prototype, 'callServerTool')
    const receive = vi.fn()
    const port = createHost()
    const stop = await port.start(receive, vi.fn(), vi.fn())
    const result = {structuredContent: {session: 'folder', workspace: '/project'}}
    listeners.mock.calls
      .filter(([event]) => event === 'toolresult')
      .forEach(([, listener]) => listener(result))
    expect(receive).toHaveBeenCalledWith(result.structuredContent)
    expect(call).not.toHaveBeenCalled()
    await stop()
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

it('should change the current chat workspace through the Codex host only', async () => {
  const connection = {session: 'changed', workspace: '/new'}
  const call = vi
    .spyOn(App.prototype, 'callServerTool')
    .mockResolvedValue({content: [], structuredContent: connection})
  try {
    expect(createHost({integration: 'standard'}).changeWorkspace).toBeUndefined()
    expect(await createHost().changeWorkspace?.('/new')).toEqual(connection)
    expect(call).toHaveBeenCalledWith({arguments: {path: '/new'}, name: 'code.workspace'})
  } finally {
    call.mockRestore()
  }
})
