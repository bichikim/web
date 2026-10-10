import * as fs from 'node:fs'
import * as asynchronous from 'node:fs/promises'
import {EventEmitter} from 'node:events'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createFileIndex} from '../create-file-index'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {...actual, watch: vi.fn(actual.watch)}
})
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {...actual, readdir: vi.fn(actual.readdir)}
})

describe('createFileIndex', () => {
  let root: string
  let index: ReturnType<typeof createFileIndex>
  const scan = async (directories: string[]) =>
    Array.fromAsync(index.scan(directories, new AbortController().signal))
  const notifyChange = (event: string, path: string) => {
    const calls: readonly unknown[][] = vi.mocked(fs.watch).mock.calls
    const listener = calls.at(-1)?.[2]
    if (typeof listener !== 'function') {
      throw new Error('Missing watcher listener')
    }
    listener(event, path)
  }
  beforeEach(() => {
    vi.mocked(fs.watch).mockReturnValue(
      Object.assign(new EventEmitter(), {close: vi.fn(), ref: vi.fn(), unref: vi.fn()}),
    )
    root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'viewer-index-')))
    fs.mkdirSync(join(root, 'src'))
    fs.writeFileSync(join(root, 'src/main.ts'), 'export const value = 1')
    index = createFileIndex(root)
  })
  afterEach(() => {
    index.dispose()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    fs.rmSync(root, {force: true, recursive: true})
  })
  it('should notify only for visible folder entries and the opened file without scanning', async () => {
    const notify = vi.fn()
    index.observe([''])
    index.open('src/main.ts')
    const stop = index.subscribe(notify)
    await scan([''])
    const reads = vi.mocked(asynchronous.readdir).mock.calls.length
    notifyChange('change', 'src/main.ts')
    notifyChange('rename', 'new.ts')
    notifyChange('rename', 'src/unopened.ts')
    notifyChange('change', 'unopened.ts')
    notifyChange('change', 'node_modules/ignored.ts')
    expect(notify).toHaveBeenCalledTimes(2)
    expect(asynchronous.readdir).toHaveBeenCalledTimes(reads)
    stop()
    notifyChange('change', 'src/main.ts')
    expect(notify).toHaveBeenCalledTimes(2)
  })
  it('should record closed source changes separately without updating the visible tree', () => {
    const visible = vi.fn()
    const changed = vi.fn()
    index.subscribe(visible)
    const stop = index.subscribeChanges(changed)
    notifyChange('change', 'src/main.ts')
    notifyChange('rename', 'src/new.ts')
    notifyChange('change', 'node_modules/ignored.ts')
    expect(visible).not.toHaveBeenCalled()
    expect(changed.mock.calls.map(([change]) => change)).toEqual([
      {event: 'change', path: 'src/main.ts'},
      {event: 'rename', path: 'src/new.ts'},
    ])
    expect(asynchronous.readdir).not.toHaveBeenCalled()
    stop()
    notifyChange('change', 'src/main.ts')
    expect(changed).toHaveBeenCalledTimes(2)
  })
  it('should read only requested directories and reuse unchanged expanded listings', async () => {
    const first = await scan([''])
    expect(first.flatMap((batch) => batch.directories)).toEqual(['src'])
    expect(first.flatMap((batch) => batch.files)).toEqual([])
    expect(asynchronous.readdir).toHaveBeenCalledTimes(1)
    await scan(['', 'src'])
    expect(asynchronous.readdir).toHaveBeenCalledTimes(2)
    await scan(['', 'src'])
    expect(asynchronous.readdir).toHaveBeenCalledTimes(2)
  })
  it('should stop recursive discovery after cancellation without reading closed descendants', async () => {
    const controller = new AbortController()
    const iterator = index.scan(undefined, controller.signal)
    const first = await iterator.next()
    expect(first.value?.directories).toEqual(['src'])
    controller.abort()
    await expect(iterator.next()).rejects.toThrow()
    expect(asynchronous.readdir).toHaveBeenCalledTimes(1)
  })
  it('should refresh reopened folders and search the latest closed subtree on demand', async () => {
    index.observe(['', 'src'])
    await scan(['', 'src'])
    index.observe([''])
    fs.writeFileSync(join(root, 'src/created.txt'), 'created')
    notifyChange('rename', 'src/created.txt')
    expect(await index.list('created')).toEqual(['src/created.txt'])
    index.observe(['', 'src'])
    expect((await scan(['', 'src'])).flatMap((batch) => batch.files)).toContainEqual({
      openable: true,
      path: 'src/created.txt',
    })
    fs.renameSync(join(root, 'src/created.txt'), join(root, 'src/renamed.txt'))
    expect(await index.list('created')).toEqual([])
    expect(await index.list('renamed')).toEqual(['src/renamed.txt'])
  })
  it('should validate requested metadata when watching is unavailable', async () => {
    vi.mocked(fs.watch).mockImplementationOnce(() => {
      throw new Error('watch unavailable')
    })
    const fallback = createFileIndex(root)
    try {
      await Array.fromAsync(fallback.scan([''], new AbortController().signal))
      fs.writeFileSync(join(root, 'created.txt'), 'created')
      const result = await Array.fromAsync(fallback.scan([''], new AbortController().signal))
      expect(result.flatMap((batch) => batch.files)).toContainEqual({
        openable: true,
        path: 'created.txt',
      })
    } finally {
      fallback.dispose()
    }
  })
  it('should not let callers mutate cached scan entries', async () => {
    const tree = await scan(['src'])
    tree[0].files[0].path = 'changed'
    tree[0].files.splice(0)
    expect((await scan(['src']))[0].files).toContainEqual({openable: true, path: 'src/main.ts'})
  })
  it('should suppress dependency events and rediscover removed environment markers', async () => {
    fs.writeFileSync(join(root, 'Cargo.toml'), '')
    for (const path of ['target/deps', 'environment/lib']) {
      fs.mkdirSync(join(root, path), {recursive: true})
      fs.writeFileSync(join(root, path, 'dependency.txt'), '')
    }
    fs.writeFileSync(join(root, 'environment/pyvenv.cfg'), '')
    index.observe([''])
    await scan([''])
    const notify = vi.fn()
    index.subscribe(notify)
    notifyChange('rename', 'target/deps/dependency.txt')
    notifyChange('rename', 'environment/lib/dependency.txt')
    expect(notify).not.toHaveBeenCalled()
    fs.rmSync(join(root, 'environment/pyvenv.cfg'))
    notifyChange('rename', 'environment/pyvenv.cfg')
    expect(notify).toHaveBeenCalledOnce()
    expect((await scan(['']))[0].directories).toContain('environment')
  })
  it('should deliver actual opened-file changes while gitignore remains unapplied', async () => {
    fs.writeFileSync(join(root, '.gitignore'), 'src/\n')
    index.dispose()
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
    vi.mocked(fs.watch).mockImplementationOnce(actual.watch)
    index = createFileIndex(root)
    expect(await index.list('main')).toEqual(['src/main.ts'])
    index.open('src/main.ts')
    let stop = () => {}
    const changed = new Promise<void>((resolve) => {
      stop = index.subscribe(resolve)
    })
    try {
      fs.writeFileSync(join(root, 'src/main.ts'), 'export const value = 2')
      await changed
    } finally {
      stop()
    }
  })
  it('should report failed directories and reject new scans after disposal', async () => {
    expect((await scan(['missing']))[0]).toMatchObject({
      complete: true,
      directory: 'missing',
      failed: true,
    })
    index.dispose()
    await expect(scan([''])).rejects.toThrow()
  })
})
