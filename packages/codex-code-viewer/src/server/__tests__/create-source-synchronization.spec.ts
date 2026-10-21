import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createSourceSynchronization} from '../create-source-synchronization'
import {readNavigationFiles} from '../navigation-cache/read-navigation-files'
import {readChangedPaths} from '../navigation-cache/read-changed-paths'
import {readPathRevisions} from '../navigation-cache/read-path-revisions'
vi.mock('../navigation-cache/read-navigation-files', () => ({readNavigationFiles: vi.fn()}))
vi.mock('../navigation-cache/read-changed-paths', () => ({readChangedPaths: vi.fn()}))
vi.mock('../navigation-cache/read-path-revisions', () => ({readPathRevisions: vi.fn()}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readChangedPaths).mockResolvedValue([])
})
describe('createSourceSynchronization', () => {
  it('should establish metadata without reopening sources and send only language changes', async () => {
    const changes = vi.fn()
    const revisions = new Map([
      ['/root/main.py', '1'],
      ['/root/closed.py', '1'],
    ])
    vi.mocked(readNavigationFiles).mockResolvedValue({
      configurations: new Map(),
      directories: new Map(),
      discovery: {directories: [], files: [], truncated: false},
      files: new Set(['main.py', 'closed.py', 'other.rb', 'core.rs', 'large.ts']),
    })
    vi.mocked(readPathRevisions).mockImplementation(
      async (paths) => new Map(paths.map((path) => [path, revisions.get(path) ?? null])),
    )
    const sync = createSourceSynchronization({
      onConfigurationChange: vi.fn(),
      onSourcesChange: changes,
      root: '/root',
    })
    const signal = new AbortController().signal
    await sync.refresh('python', signal)
    expect(changes).not.toHaveBeenCalled()
    expect(readPathRevisions).toHaveBeenCalledWith(['/root/main.py', '/root/closed.py'], signal)
    revisions.set('/root/closed.py', '2')
    await sync.refresh('python', signal)
    expect(changes).toHaveBeenLastCalledWith([{kind: 'changed', path: '/root/closed.py'}])
    expect(readNavigationFiles).toHaveBeenCalledOnce()
    vi.mocked(readChangedPaths).mockResolvedValue(['/root'])
    revisions.delete('/root/closed.py')
    revisions.set('/root/later.py', '1')
    vi.mocked(readNavigationFiles).mockResolvedValue({
      configurations: new Map(),
      directories: new Map(),
      discovery: {directories: [], files: [], truncated: false},
      files: new Set(['main.py', 'later.py']),
    })
    await sync.refresh('python', signal)
    expect(changes).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        {kind: 'deleted', path: '/root/closed.py'},
        {kind: 'created', path: '/root/later.py'},
      ]),
    )
  })
  it('should reset analyzers for configuration changes and recover after an aborted preparation', async () => {
    const configure = vi.fn()
    const changes = vi.fn()
    const listing = {
      configurations: new Map([['/root/pyproject.toml', '1']]),
      directories: new Map<string, string>(),
      discovery: {directories: [], files: [], truncated: false},
      files: new Set(['main.py']),
    }
    vi.mocked(readNavigationFiles).mockResolvedValue(listing)
    vi.mocked(readPathRevisions).mockResolvedValue(new Map([['/root/main.py', '1']]))
    const sync = createSourceSynchronization({
      onConfigurationChange: configure,
      onSourcesChange: changes,
      root: '/root',
    })
    const signal = new AbortController().signal
    await sync.refresh('python', signal)
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(sync.refresh('python', cancelled.signal)).rejects.toThrow()
    listing.configurations.set('/root/pyproject.toml', '2')
    await sync.refresh('python', signal)
    expect(configure).toHaveBeenCalledOnce()
    expect(changes).not.toHaveBeenCalled()
  })
  it('should cancel queued preparation before an earlier scan completes', async () => {
    const discovered = Promise.withResolvers<Awaited<ReturnType<typeof readNavigationFiles>>>()
    vi.mocked(readNavigationFiles).mockReturnValueOnce(discovered.promise)
    vi.mocked(readPathRevisions).mockResolvedValue(new Map())
    const sync = createSourceSynchronization({
      onConfigurationChange: vi.fn(),
      onSourcesChange: vi.fn(),
      root: '/root',
    })
    const active = sync.refresh('python', new AbortController().signal)
    const controller = new AbortController()
    let cancelled = false
    const queued = sync.refresh('ruby', controller.signal).catch((error: unknown) => {
      cancelled = error === controller.signal.reason
    })
    controller.abort()
    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
    try {
      expect(cancelled).toBe(true)
    } finally {
      discovered.resolve({
        configurations: new Map(),
        directories: new Map(),
        discovery: {directories: [], files: [], truncated: false},
        files: new Set(),
      })
      await active
      await queued
    }
    await sync.refresh('ruby', new AbortController().signal)
    expect(readNavigationFiles).toHaveBeenCalledOnce()
  })
})
