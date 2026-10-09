import {afterEach, describe, expect, it, vi} from 'vitest'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import {createPort, createViewerFixture, document} from './fixtures/viewer'

describe('useViewer files', () => {
  const {mount, dispose} = createViewerFixture()
  afterEach(() => {
    dispose()
    vi.unstubAllGlobals()
  })
  it('should check workspace events while dirty and defer replacing the document until discard', async () => {
    const port = createPort()
    const listener = {
      receive: () => {
        /* Installed by watch. */
      },
    }
    port.watch = vi.fn(async (_session, receive) => {
      listener.receive = receive
      return async () => {
        /* No transport in this fixture. */
      }
    })
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      structuredContent: {
        document: {...document('main.tsx'), revision: 'external', source: 'updated'},
      },
    })
    listener.receive()
    await vi.waitFor(() => expect(viewer.session()?.document.source).toBe('updated'), {interval: 1})
    expect(viewer.address()).toBe('main.tsx:3:1-5:1')
    viewer.editing.change('my draft')
    const calls = vi.mocked(port.call).mock.calls.length
    listener.receive()
    expect(viewer.editing.source()).toBe('my draft')
    await vi.waitFor(() => expect(viewer.busy()).toBe(false), {interval: 1})
    expect(port.call).toHaveBeenCalledTimes(calls + 1)
    viewer.editing.discard()
    await vi.waitFor(() => expect(port.call).toHaveBeenCalledTimes(calls + 2), {interval: 1})
  })

  it('should mark an externally deleted file and retain its last contents without a transient error', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    expect(viewer.deleted()).toBe(true)
    expect(viewer.editing.dirty()).toBe(true)
    expect(viewer.session()?.document.source).toBe('main.tsx')
    expect(viewer.notice()).toBeNull()
    await viewer.go(document('other.ts').location)
    expect(viewer.deleted()).toBe(false)
  })

  it('should preserve a deleted file draft and recreate it on save', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.editing.change('my unsaved draft')
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    expect(viewer.deleted()).toBe(true)
    expect(viewer.editing.source()).toBe('my unsaved draft')
    expect(viewer.editing.dirty()).toBe(true)
    vi.mocked(port.call).mockResolvedValue({
      content: [],
      structuredContent: {document: {...document('main.tsx'), source: 'my unsaved draft'}},
    })
    expect(await viewer.editing.save()).toBe(true)
    expect(port.call).toHaveBeenLastCalledWith('code.write', {
      path: 'main.tsx',
      revision: null,
      session: 'session',
      source: 'my unsaved draft',
    })
    expect(viewer.deleted()).toBe(false)
    expect(viewer.editing.dirty()).toBe(false)
    expect(viewer.editing.source()).toBe('my unsaved draft')
  })

  it('should preserve a draft when the deleted file is externally restored', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.editing.change('my unsaved draft')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    await viewer.refresh()
    expect(viewer.deleted()).toBe(false)
    expect(viewer.editing.source()).toBe('my unsaved draft')
  })

  it.each([false, true])(
    'should close a deleted file on discard with prior edits %j',
    async (edited) => {
      const port = createPort()
      const viewer = mount(port)
      if (edited) {
        viewer.editing.change('my draft')
      }
      vi.mocked(port.call).mockResolvedValueOnce({
        content: [],
        isError: true,
        structuredContent: {code: 'not-found'},
      })
      await viewer.refresh()
      viewer.editing.discard()
      expect(viewer.session()).toBeNull()
      expect(viewer.workspaceSession()).toEqual({session: 'session', workspace: '/project'})
      expect(viewer.editing.pendingFiles()).toEqual([])
      expect(viewer.selection()).toBeNull()
      expect(port.call).not.toHaveBeenCalledWith('code.close', expect.anything())
    },
  )

  it('should retain another file draft when discarding a deleted file', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.editing.change('keep this draft')
    await viewer.go(document('other.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    viewer.editing.discard()
    expect(viewer.session()).toBeNull()
    expect(viewer.editing.pendingFiles()).toEqual(['main.tsx'])
    await viewer.go(document('main.tsx').location)
    expect(viewer.editing.source()).toBe('keep this draft')
  })

  it('should keep a read permission failure distinct from deletion', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'read-failed'},
    })
    await viewer.refresh()
    expect(viewer.deleted()).toBe(false)
    expect(viewer.notice()?.message).toBe(
      '파일을 읽지 못했습니다. 연결과 파일 권한을 확인해 주세요.',
    )
  })

  it('should ignore deletion results superseded by navigation to another file', async () => {
    const port = createPort()
    const pending = Promise.withResolvers<CallToolResult>()
    vi.mocked(port.call).mockReturnValueOnce(pending.promise)
    const viewer = mount(port)
    const refresh = viewer.refresh()
    await viewer.go(document('other.ts').location)
    pending.resolve({content: [], isError: true, structuredContent: {code: 'not-found'}})
    await refresh
    expect(viewer.deleted()).toBe(false)
    expect(viewer.session()?.document.location.path).toBe('other.ts')
  })

  it('should follow a moved current file and remove stale history paths', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('src/item.ts').location)
    await viewer.fileMutation({
      action: 'cut',
      entry: {kind: 'directory', path: 'dest/src'},
      source: 'src',
    })
    expect(viewer.session()?.document.location.path).toBe('dest/src/item.ts')
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).not.toBe('src/item.ts')
  })

  it.each(['src', 'src/item.ts'])(
    'should follow a renamed entry %s and update history',
    async (source) => {
      const viewer = mount(createPort())
      await viewer.go(document('src/item.ts').location)
      const folder = source === 'src'
      await viewer.fileMutation({
        action: 'rename',
        entry: {kind: folder ? 'directory' : 'file', path: folder ? 'source' : 'src/helper.ts'},
        source,
      })
      expect(viewer.session()?.document.location.path).toBe(
        folder ? 'source/item.ts' : 'src/helper.ts',
      )
      await viewer.move(-1)
      expect(viewer.session()?.document.location.path).not.toBe('src/item.ts')
    },
  )

  it('should clear deletion-only drafts when a rename finishes after a watcher refresh', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    expect(viewer.editing.pendingFiles()).toEqual(['main.tsx'])
    await viewer.fileMutation({
      action: 'rename',
      entry: {kind: 'file', path: 'renamed.tsx'},
      source: 'main.tsx',
    })
    expect(viewer.session()?.document.location.path).toBe('renamed.tsx')
    expect(viewer.editing.pendingFiles()).toEqual([])
    expect(viewer.deleted()).toBe(false)
  })

  it('should clear a deleted current document without closing its workspace session', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.fileMutation({
      action: 'delete',
      entry: {kind: 'file', path: 'main.tsx'},
      source: 'main.tsx',
    })
    expect(viewer.session()).toBeNull()
    expect(viewer.workspaceSession()).toEqual({session: 'session', workspace: '/project'})
    expect(viewer.selection()).toBeNull()
    expect(viewer.canBack()).toBe(false)
  })
})
