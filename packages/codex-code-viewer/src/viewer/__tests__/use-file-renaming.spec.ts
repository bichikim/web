/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerConnection} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useFileRenaming} from '../use-file-renaming'

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
      call: vi.fn(async (name, input) => ({
        content: [],
        structuredContent:
          name === 'code.entry'
            ? {kind: 'file', path: input.path, revision: 'revision'}
            : {kind: 'file', path: `src/${input.name}`},
      })),
      context: vi.fn(),
      start: vi.fn(),
    }
    const changed = vi.fn().mockResolvedValue(undefined)
    const operations = useFileRenaming({
      busy: () => false,
      onChanged: changed,
      pendingPaths: drafts,
      port,
      saving: () => false,
      session,
    })
    return {changed, operations, port, setDrafts, setSession}
  })
const file = {kind: 'file', path: '/project/src/main.ts'} as const

describe('useFileRenaming', () => {
  it('should retain the dialog and typed name after a collision and retry successfully', async () => {
    const {operations, port, changed} = mount()
    await operations.askRename(file)
    operations.changeRename('helper.ts')
    vi.mocked(port.call).mockResolvedValueOnce({
      content: [],
      isError: true,
      structuredContent: {code: 'already-exists'},
    })
    await operations.confirmRename()
    expect(operations.renaming()?.path).toBe('src/main.ts')
    expect(operations.renameName()).toBe('helper.ts')
    expect(operations.renameFeedback()).toContain('이미')
    expect(changed).not.toHaveBeenCalled()
    await operations.confirmRename()
    expect(operations.renaming()).toBeNull()
    expect(changed).toHaveBeenCalledWith({
      action: 'rename',
      entry: {kind: 'file', path: 'src/helper.ts'},
      source: 'src/main.ts',
    })
  })
  it('should recheck unsaved descendants before renaming', async () => {
    const {operations, port, setDrafts} = mount()
    await operations.askRename(file)
    operations.changeRename('helper.ts')
    setDrafts(['src/main.ts'])
    await operations.confirmRename()
    expect(port.call).not.toHaveBeenCalledWith('code.rename', expect.anything())
    expect(operations.renameFeedback()).toContain('미저장')
    operations.cancelRename()
    await operations.askRename({kind: 'directory', path: '/project/src'})
    expect(operations.renaming()).toBeNull()
  })
  it('should close an unchanged name without a disk mutation', async () => {
    const {operations, port} = mount()
    await operations.askRename(file)
    await operations.confirmRename()
    expect(operations.renaming()).toBeNull()
    expect(port.call).not.toHaveBeenCalledWith('code.rename', expect.anything())
  })
  it('should ignore an in-flight rename result after changing workspaces', async () => {
    const {operations, port, setSession, changed} = mount()
    await operations.askRename(file)
    operations.changeRename('helper.ts')
    const response = Promise.withResolvers<Awaited<ReturnType<ViewerPort['call']>>>()
    vi.mocked(port.call).mockReturnValueOnce(response.promise)
    const pending = operations.confirmRename()
    setSession({session: 'second', workspace: '/other'})
    response.resolve({content: [], structuredContent: {kind: 'file', path: 'src/helper.ts'}})
    await pending
    expect(changed).not.toHaveBeenCalled()
    expect(operations.renaming()).toBeNull()
    expect(operations.renameFeedback()).toBe('')
  })
})
