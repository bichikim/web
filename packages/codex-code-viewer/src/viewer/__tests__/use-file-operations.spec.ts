/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerConnection} from '../../shared/contracts'
import type {ViewerPort, WorkspaceSelection} from '../types'
import {useFileOperations} from '../use-file-operations'

const file: WorkspaceSelection = {kind: 'file', path: '/project/src/main.ts'}
const destination: WorkspaceSelection = {kind: 'directory', path: '/project/dest'}
const disposers: (() => void)[] = []
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()))
const mount = () =>
  createRoot((dispose) => {
    disposers.push(dispose)
    const [session, setSession] = createSignal<ViewerConnection>({
      session: 'first',
      workspace: '/project',
    })
    const [drafts, setDrafts] = createSignal<readonly string[]>([])
    const port: ViewerPort = {
      call: vi.fn(async (name) => ({
        content: [],
        structuredContent:
          name === 'code.entry'
            ? {kind: 'file', path: 'src/main.ts', revision: 'revision'}
            : {kind: 'file', path: 'dest/main.ts'},
      })),
      context: vi.fn(),
      start: vi.fn(),
    }
    const changed = vi.fn().mockResolvedValue(undefined)
    const operations = useFileOperations({
      onChanged: changed,
      pendingPaths: drafts,
      port,
      saving: () => false,
      session,
    })
    return {changed, operations, port, setDrafts, setSession}
  })
describe('useFileOperations', () => {
  it('should copy and repeatedly paste a revision-checked file into the selected folder', async () => {
    const {changed, operations, port} = mount()
    await operations.copy(file)
    await operations.paste(destination)
    await operations.paste(destination)
    expect(port.call).toHaveBeenCalledWith('code.transfer', {
      action: 'copy',
      parent: 'dest',
      path: 'src/main.ts',
      revision: 'revision',
      session: 'first',
    })
    expect(changed).toHaveBeenCalledTimes(2)
    expect(operations.canPaste()).toBe(true)
  })
  it('should keep cut contents on failure and consume them only after successful paste', async () => {
    const {operations, port} = mount()
    await operations.cut(file)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'already-exists'},
    })
    await operations.paste(destination)
    expect(operations.canPaste()).toBe(true)
    expect(operations.feedback()).toContain('이미')
    await operations.paste(destination)
    expect(operations.canPaste()).toBe(false)
  })
  it('should open confirmation without deleting, allow cancellation and recheck drafts before deletion', async () => {
    const {operations, port, setDrafts} = mount()
    await operations.askDelete(file)
    expect(operations.deleting()?.path).toBe('src/main.ts')
    expect(port.call).not.toHaveBeenCalledWith('code.remove', expect.anything())
    operations.cancelDelete()
    expect(operations.deleting()).toBeNull()
    await operations.askDelete(file)
    setDrafts(['src/main.ts'])
    await operations.confirmDelete()
    expect(port.call).not.toHaveBeenCalledWith('code.remove', expect.anything())
    expect(operations.feedback()).toContain('저장')
  })
  it('should delete only the confirmed revision and publish the removed entry', async () => {
    const {changed, operations, port} = mount()
    await operations.askDelete(file)
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      structuredContent: {kind: 'file', path: 'src/main.ts'},
    })
    await operations.confirmDelete()
    expect(port.call).toHaveBeenCalledWith('code.remove', {
      path: 'src/main.ts',
      revision: 'revision',
      session: 'first',
    })
    expect(changed).toHaveBeenCalledWith({
      action: 'delete',
      entry: {kind: 'file', path: 'src/main.ts'},
      source: 'src/main.ts',
    })
    expect(operations.deleting()).toBeNull()
  })
  it('should block a folder containing drafts and recheck a cut source before paste', async () => {
    const {operations, port, setDrafts} = mount()
    await operations.cut(file)
    setDrafts(['src/main.ts'])
    await operations.paste(destination)
    expect(port.call).not.toHaveBeenCalledWith('code.transfer', expect.anything())
    await operations.askDelete({kind: 'directory', path: '/project/src'})
    expect(operations.deleting()).toBeNull()
  })
  it('should clear clipboard and confirmation when changing workspaces', async () => {
    const {operations, setSession} = mount()
    await operations.copy(file)
    await operations.askDelete(file)
    setSession({session: 'second', workspace: '/other'})
    await Promise.resolve()
    expect(operations.canPaste()).toBe(false)
    expect(operations.deleting()).toBeNull()
  })
  it('should discard a pending result after the workspace has changed', async () => {
    const {operations, port, setSession, changed} = mount()
    await operations.cut(file)
    let complete: (result: Awaited<ReturnType<ViewerPort['call']>>) => void = () => {}
    vi.mocked(port.call).mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      }),
    )
    const pasting = operations.paste(destination)
    setSession({session: 'second', workspace: '/other'})
    complete({content: [], structuredContent: {kind: 'file', path: 'dest/main.ts'}})
    await pasting
    expect(changed).not.toHaveBeenCalled()
    expect(operations.canPaste()).toBe(false)
  })
  it('should retain the new workspace paste indicator when an older paste completes', async () => {
    const {operations, port, setSession, changed} = mount()
    await operations.copy(file)
    const older = Promise.withResolvers<Awaited<ReturnType<ViewerPort['call']>>>()
    vi.mocked(port.call).mockReturnValueOnce(older.promise)
    const previous = operations.paste(destination)
    setSession({session: 'second', workspace: '/project'})
    await operations.copy(file)
    const newer = Promise.withResolvers<Awaited<ReturnType<ViewerPort['call']>>>()
    vi.mocked(port.call).mockReturnValueOnce(newer.promise)
    const current = operations.paste(destination)
    older.resolve({content: [], structuredContent: {kind: 'file', path: 'dest/main.ts'}})
    await previous
    expect(operations.pasting()).toBe(true)
    expect(changed).not.toHaveBeenCalled()
    newer.resolve({content: [], structuredContent: {kind: 'file', path: 'dest/main.ts'}})
    await current
    expect(operations.pasting()).toBe(false)
    expect(changed).toHaveBeenCalledTimes(1)
  })
})
