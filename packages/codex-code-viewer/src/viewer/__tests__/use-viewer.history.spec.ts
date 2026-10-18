import {afterEach, describe, expect, it, vi} from 'vitest'
import {createPort, createViewerFixture, document, result} from './fixtures/viewer'

describe('useViewer deleted history', () => {
  const {mount, dispose} = createViewerFixture()
  afterEach(dispose)
  it('should skip missing visits in both directions and disable exhausted history', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call)
      .mockClear()
      .mockImplementation(async (_name, input) =>
        input.path === 'removed.ts'
          ? {content: [], isError: true, structuredContent: {code: 'not-found'}}
          : result(String(input.path)),
      )
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('main.tsx')
    expect(viewer.notice()).toBeNull()
    expect(viewer.canBack()).toBe(false)
    await viewer.move(1)
    expect(viewer.session()?.document.location.path).toBe('current.ts')
    expect(viewer.canForward()).toBe(false)
    expect(
      vi.mocked(port.call).mock.calls.filter(([, input]) => input.path === 'removed.ts'),
    ).toHaveLength(1)
  })
  it('should retain other visits and open the previous file when the current file is deleted', async () => {
    const viewer = mount(createPort())
    await viewer.go(document('middle.ts').location)
    await viewer.go(document('current.ts').location)
    await viewer.fileMutation({
      action: 'delete',
      entry: {kind: 'file', path: 'current.ts'},
      source: 'current.ts',
    })
    expect(viewer.session()?.document.location.path).toBe('middle.ts')
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('main.tsx')
  })
  it('should reopen a retained draft after deletion and recreate it on save', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    viewer.editing.change('unsaved code')
    vi.mocked(port.call).mockImplementation(async (name, input) =>
      input.path === 'removed.ts' && name === 'code.read'
        ? {content: [], isError: true, structuredContent: {code: 'not-found'}}
        : {
            content: [],
            structuredContent: {
              document: {
                ...document(String(input.path)),
                source: String(input.source ?? input.path),
              },
            },
          },
    )
    await viewer.refresh()
    await viewer.go(document('current.ts').location)
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('removed.ts')
    expect(viewer.editing.source()).toBe('unsaved code')
    expect(viewer.deleted()).toBe(true)
    expect(await viewer.editing.save()).toBe(true)
    expect(port.call).toHaveBeenLastCalledWith('code.write', {
      path: 'removed.ts',
      revision: null,
      session: 'session',
      source: 'unsaved code',
    })
    expect(viewer.deleted()).toBe(false)
  })
  it('should retain deletion-only contents when reopening an unedited deleted file', async () => {
    const port = createPort()
    const viewer = mount(port)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.refresh()
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('main.tsx')
    expect(viewer.editing.source()).toBe('main.tsx')
    expect(viewer.deleted()).toBe(true)
    expect(viewer.editing.dirty()).toBe(true)
  })
  it('should retain history and report permission failures rather than skip them', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('blocked.ts').location)
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'read-failed'},
    })
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('current.ts')
    expect(viewer.notice()).not.toBeNull()
    expect(viewer.canBack()).toBe(true)
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('blocked.ts')
  })
  it('should stop a missing-history traversal when another navigation supersedes it', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('current.ts').location)
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof port.call>>>()
    const started = Promise.withResolvers<void>()
    vi.mocked(port.call)
      .mockClear()
      .mockImplementationOnce(() => {
        started.resolve()
        return pending.promise
      })
    const older = viewer.move(-1)
    await started.promise
    await viewer.go(document('latest.ts').location)
    pending.resolve({content: [], isError: true, structuredContent: {code: 'not-found'}})
    await older
    expect(viewer.session()?.document.location.path).toBe('latest.ts')
    expect(viewer.notice()).toBeNull()
    expect(port.call).toHaveBeenCalledTimes(2)
  })
  it('should keep the current file and disable back when every earlier file is missing', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call)
      .mockClear()
      .mockResolvedValue({content: [], isError: true, structuredContent: {code: 'not-found'}})
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('current.ts')
    expect(viewer.canBack()).toBe(false)
    expect(viewer.notice()).toBeNull()
    expect(port.call).toHaveBeenCalledTimes(2)
    await viewer.move(-1)
    expect(port.call).toHaveBeenCalledTimes(2)
  })
  it('should reconsider missing visits after manual refresh restores a file', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.move(-1)
    await viewer.move(1)
    await viewer.refresh()
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('removed.ts')
  })
  it('should reconsider missing visits after a workspace event without checking every history file', async () => {
    const port = createPort()
    const subscribed = Promise.withResolvers<void>()
    const listener: {receive: () => void} = {receive: vi.fn()}
    port.watch = async (_session, receive) => {
      listener.receive = receive
      subscribed.resolve()
      return async () => undefined
    }
    const viewer = mount(port)
    await subscribed.promise
    await viewer.go(document('removed.ts').location)
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.move(-1)
    await viewer.move(1)
    vi.mocked(port.call).mockClear()
    listener.receive()
    await vi.waitFor(() => expect(viewer.busy()).toBe(false), {interval: 1})
    expect(vi.mocked(port.call).mock.calls.filter(([name]) => name === 'code.read')).toHaveLength(1)
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('removed.ts')
  })
  it('should remove a deleted folder subtree while preserving unrelated backward and forward visits', async () => {
    const viewer = mount(createPort())
    await viewer.go(document('src/a.ts').location)
    await viewer.go(document('keep.ts').location)
    await viewer.go(document('src/b.ts').location)
    await viewer.fileMutation({
      action: 'delete',
      entry: {kind: 'directory', path: 'src'},
      source: 'src',
    })
    expect(viewer.session()?.document.location.path).toBe('keep.ts')
    await viewer.move(-1)
    expect(viewer.session()?.document.location.path).toBe('main.tsx')
    await viewer.move(1)
    expect(viewer.session()?.document.location.path).toBe('keep.ts')
    expect(viewer.canForward()).toBe(false)
  })
  it('should open the next retained file when deleting the first visit', async () => {
    const viewer = mount(createPort())
    await viewer.go(document('next.ts').location)
    await viewer.move(-1)
    await viewer.fileMutation({
      action: 'delete',
      entry: {kind: 'file', path: 'main.tsx'},
      source: 'main.tsx',
    })
    expect(viewer.session()?.document.location.path).toBe('next.ts')
    expect(viewer.canBack()).toBe(false)
  })
  it('should recover another visit after discarding a reopened deleted draft', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.go(document('removed.ts').location)
    viewer.editing.change('draft')
    await viewer.go(document('current.ts').location)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'not-found'},
    })
    await viewer.move(-1)
    expect(viewer.deleted()).toBe(true)
    viewer.editing.discard()
    await vi.waitFor(() => expect(viewer.session()?.document.location.path).toBe('main.tsx'), {
      interval: 1,
    })
    expect(viewer.editing.pendingFiles()).toEqual([])
    await viewer.move(1)
    expect(viewer.session()?.document.location.path).toBe('current.ts')
  })
})
