import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createEntry} from '../create-entry'
import {createFileIndex} from '../create-file-index'

describe('createEntry', () => {
  let root: string
  let outside: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'viewer-create-'))
    outside = mkdtempSync(join(tmpdir(), 'viewer-outside-'))
    mkdirSync(join(root, 'src'))
  })
  afterEach(() => {
    rmSync(root, {force: true, recursive: true})
    rmSync(outside, {force: true, recursive: true})
  })
  it('should create an empty sibling file and retain empty directories in fresh tree listings', async () => {
    const index = createFileIndex(root)
    try {
      await index.tree()
      expect(createEntry({kind: 'file', name: 'new.ts', parent: 'src', root})).toEqual({
        ok: true,
        value: {kind: 'file', path: 'src/new.ts'},
      })
      expect(readFileSync(join(root, 'src/new.ts'), 'utf8')).toBe('')
      expect(createEntry({kind: 'directory', name: 'empty', parent: 'src', root})).toEqual({
        ok: true,
        value: {kind: 'directory', path: 'src/empty'},
      })
      expect(await index.tree()).toMatchObject({
        directories: ['src', 'src/empty'],
        files: [{openable: true, path: 'src/new.ts'}],
      })
    } finally {
      index.dispose()
    }
  })
  it('should reject existing files, directories and symlinks without changing their contents', async () => {
    writeFileSync(join(root, 'keep.ts'), 'keep')
    symlinkSync(join(outside, 'missing'), join(root, 'link.ts'))
    for (const name of ['keep.ts', 'src', 'link.ts']) {
      for (const kind of ['file', 'directory'] as const) {
        expect(createEntry({kind, name, parent: '', root})).toMatchObject({
          error: {code: 'already-exists'},
          ok: false,
        })
      }
    }
    expect(readFileSync(join(root, 'keep.ts'), 'utf8')).toBe('keep')
  })
  it.each([
    '',
    '.',
    '..',
    '../escape.ts',
    '/absolute.ts',
    'a/b.ts',
    'a\\b.ts',
    'a:b.ts',
    '.git',
    'dist',
    '.env',
    'a\0b',
  ])('should reject invalid or undiscoverable names: %j', async (name) => {
    expect(createEntry({kind: 'file', name, parent: '', root})).toMatchObject({
      error: {code: 'invalid-name'},
      ok: false,
    })
  })
  it('should reject outside and private parents including symlink aliases', async () => {
    mkdirSync(join(root, '.git'))
    symlinkSync(outside, join(root, 'outside'))
    symlinkSync(join(root, '.git'), join(root, 'private'))
    for (const parent of ['..', outside, 'outside', '.git', 'private']) {
      expect(createEntry({kind: 'file', name: 'new.ts', parent, root})).toMatchObject({
        error: {code: 'outside-workspace'},
        ok: false,
      })
    }
    expect(existsSync(join(outside, 'new.ts'))).toBe(false)
    expect(existsSync(join(root, '.git/new.ts'))).toBe(false)
  })
  it('should permit named dotfiles but reject hidden directories that would not appear in the tree', async () => {
    expect(createEntry({kind: 'file', name: '.gitignore', parent: '', root})).toMatchObject({
      ok: true,
    })
    expect(createEntry({kind: 'directory', name: '.dockerignore', parent: '', root})).toMatchObject(
      {error: {code: 'invalid-name'}, ok: false},
    )
    mkdirSync(join(root, '.dockerignore'))
    expect(
      createEntry({kind: 'file', name: 'new.ts', parent: '.dockerignore', root}),
    ).toMatchObject({error: {code: 'outside-workspace'}, ok: false})
  })
  it('should report a missing parent without creating intermediate folders', async () => {
    expect(createEntry({kind: 'file', name: 'new.ts', parent: 'missing', root})).toMatchObject({
      error: {code: 'create-failed'},
      ok: false,
    })
    expect(existsSync(join(root, 'missing'))).toBe(false)
  })
})
