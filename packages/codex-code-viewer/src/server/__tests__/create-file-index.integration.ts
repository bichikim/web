import * as fs from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createFileIndex} from '../create-file-index'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {...actual, readdirSync: vi.fn(actual.readdirSync), watch: vi.fn(actual.watch)}
})

describe('createFileIndex', () => {
  let root: string
  let index: ReturnType<typeof createFileIndex>
  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), 'viewer-index-'))
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
  it('should share a single scan between tree and incremental searches', () => {
    const scan = vi.mocked(fs.readdirSync)
    expect(index.tree().files).toContainEqual({openable: true, path: 'src/main.ts'})
    const calls = scan.mock.calls.length
    expect(index.list('ma')).toEqual(['src/main.ts'])
    expect(index.list('main')).toEqual(['src/main.ts'])
    index.tree()
    expect(scan).toHaveBeenCalledTimes(calls)
  })
  it('should notice additions, renames, and removals before watcher delivery', () => {
    index.tree()
    fs.mkdirSync(join(root, 'src/new'))
    fs.writeFileSync(join(root, 'src/new/created.txt'), 'created')
    expect(index.list('created')).toEqual(['src/new/created.txt'])
    fs.renameSync(join(root, 'src/new/created.txt'), join(root, 'src/new/renamed.txt'))
    expect(index.list('created')).toEqual([])
    expect(index.list('renamed')).toEqual(['src/new/renamed.txt'])
    fs.rmSync(join(root, 'src/new'), {recursive: true})
    expect(index.list('renamed')).toEqual([])
  })
  it('should retain metadata validation when watching is unavailable', () => {
    vi.mocked(fs.watch).mockImplementationOnce(() => {
      throw new Error('watch unavailable')
    })
    const fallback = createFileIndex(root)
    try {
      fallback.tree()
      fs.writeFileSync(join(root, 'created.txt'), 'created')
      expect(fallback.list('created')).toEqual(['created.txt'])
    } finally {
      fallback.dispose()
    }
  })
  it('should not let callers mutate a cached tree snapshot', () => {
    const tree = index.tree()
    tree.files[0].path = 'changed'
    tree.files.splice(0)
    expect(index.tree().files).toContainEqual({openable: true, path: 'src/main.ts'})
  })
})
