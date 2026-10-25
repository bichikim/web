/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import type {FileBaseline} from '../../shared/change-contracts'
import {useDeletedDocument} from '../use-deleted-document'
import {useCodeEditing} from '../use-code-editing'
import {createPort, initial} from './fixtures/viewer'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'

const disposals: Array<() => void> = []
afterEach(() => disposals.splice(0).forEach((dispose) => dispose()))
const baseline: FileBaseline = {available: true, base: 'HEAD', source: 'previous content'}
const mount = (readBaseline = vi.fn().mockResolvedValue(baseline)) =>
  createRoot((dispose) => {
    disposals.push(dispose)
    const [workspace, changeWorkspace] = createSignal('/project')
    const [path, changePath] = createSignal('current.ts')
    const onOpen = vi.fn()
    const onMove = vi.fn()
    const onError = vi.fn()
    const document = useDeletedDocument({
      documentPath: path,
      onError,
      onMove,
      onOpen,
      onRefresh: vi.fn(),
      port: {call: vi.fn(), context: vi.fn(), readBaseline, start: vi.fn()},
      revision: () => 0,
      session: () => ({session: 'one', workspace: workspace()}),
    })
    return {changePath, changeWorkspace, document, onError, onMove, onOpen}
  })
it('should open the baseline in the body and return without navigating or writing to disk', async () => {
  const fixture = mount()
  await fixture.document.open('old/gone.ts')
  expect(fixture.document.document()).toEqual({
    base: 'HEAD',
    path: 'old/gone.ts',
    source: 'previous content',
  })
  fixture.document.move(-1)
  expect(fixture.document.document()).toBeNull()
  expect(fixture.onMove).not.toHaveBeenCalled()
  await fixture.document.open('old/gone.ts')
  fixture.document.openLocation({column: 1, line: 1, path: 'current.ts'})
  expect(fixture.document.document()).toBeNull()
  expect(fixture.onOpen).toHaveBeenCalledWith({column: 1, line: 1, path: 'current.ts'}, undefined)
})
it('should discard a pending baseline when ordinary navigation or the workspace replaces it', async () => {
  let resolve: (value: FileBaseline) => void = () => {}
  const read = vi.fn().mockImplementation(
    () =>
      new Promise<FileBaseline>((done) => {
        resolve = done
      }),
  )
  const fixture = mount(read)
  const opening = fixture.document.open('old/gone.ts')
  fixture.document.openLocation({column: 1, line: 1, path: 'current.ts'})
  resolve(baseline)
  await opening
  expect(fixture.document.document()).toBeNull()
  const next = fixture.document.open('old/gone.ts')
  fixture.changeWorkspace('/other')
  resolve(baseline)
  await next
  expect(fixture.document.document()).toBeNull()
})
it('should clear the previous file on navigation and show an unavailable baseline without editing it', async () => {
  const read = vi.fn().mockResolvedValue({...baseline, source: null})
  const fixture = mount(read)
  await fixture.document.open('old/binary.png')
  expect(fixture.document.document()?.source).toBeNull()
  fixture.changePath('another.ts')
  expect(fixture.document.document()).toBeNull()
  read.mockRejectedValue(new Error('read failed'))
  await fixture.document.open('old/gone.ts')
  await waitFor(() => expect(fixture.onError).toHaveBeenCalled(), {interval: 1})
  expect(fixture.document.document()).toBeNull()
})
it('should restore a deleted draft even when the workspace has no live document', async () => {
  localStorage.clear()
  const port = {
    ...createPort(),
    draftStorage: () => localStorage,
    readBaseline: vi.fn().mockResolvedValue(baseline),
  }
  const setup = () =>
    createRoot((dispose) => {
      disposals.push(dispose)
      const editing = useCodeEditing({port, session: () => null})
      const deleted = useDeletedDocument({
        documentPath: () => undefined,
        editing,
        onError: vi.fn(),
        onMove: vi.fn(),
        onOpen: vi.fn(),
        onRefresh: vi.fn(),
        port,
        revision: () => 0,
        session: () => ({session: initial.session, workspace: initial.workspace}),
      })
      return {deleted, dispose}
    })
  const first = setup()
  await first.deleted.open('removed.ts')
  first.deleted.toggleEditing()
  first.deleted.change('recovered deleted draft')
  first.dispose()
  const second = setup()
  await second.deleted.open('removed.ts')
  expect(second.deleted.source()).toBe('recovered deleted draft')
  expect(second.deleted.enabled()).toBe(false)
  localStorage.clear()
})
it.each(['close', 'dispose'] as const)(
  'should complete a save after %s without reopening the departed document',
  async (action) => {
    let finish: (value: CallToolResult) => void = () => {}
    const port = {...createPort(), readBaseline: vi.fn().mockResolvedValue(baseline)}
    vi.mocked(port.call).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const onOpen = vi.fn()
    let disposeView = () => {}
    const fixture = createRoot((dispose) => {
      disposeView = dispose
      disposals.push(dispose)
      const editing = useCodeEditing({port, session: () => initial})
      return useDeletedDocument({
        documentPath: () => 'main.tsx',
        editing,
        onError: vi.fn(),
        onMove: vi.fn(),
        onOpen,
        onRefresh: vi.fn(),
        port,
        revision: () => 0,
        session: () => initial,
      })
    })
    await fixture.open('removed.ts')
    fixture.toggleEditing()
    fixture.change('new content')
    const saving = fixture.save()
    if (action === 'close') {
      fixture.close()
    } else {
      disposeView()
    }
    finish({
      content: [],
      structuredContent: {
        document: {
          ...initial.document,
          location: {column: 1, line: 1, path: 'removed.ts'},
          source: 'new content',
        },
      },
    })
    await saving
    expect(onOpen).not.toHaveBeenCalled()
    expect(fixture.document()).toBeNull()
  },
)
it('should preserve a deleted view when the retained live document refreshes at the same path', async () => {
  const [session, setSession] = createSignal(initial)
  const deleted = createRoot((dispose) => {
    disposals.push(dispose)
    return useDeletedDocument({
      documentPath: () => session().document.location.path,
      onError: vi.fn(),
      onMove: vi.fn(),
      onOpen: vi.fn(),
      onRefresh: vi.fn(),
      port: {...createPort(), readBaseline: vi.fn().mockResolvedValue(baseline)},
      revision: () => 0,
      session,
    })
  })
  await deleted.open('removed.ts')
  setSession({...initial, document: {...initial.document, revision: 'refreshed'}})
  expect(deleted.document()?.path).toBe('removed.ts')
})
