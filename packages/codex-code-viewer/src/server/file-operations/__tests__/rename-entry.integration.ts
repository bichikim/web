import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readEntry} from '../read-entry'
import {renameEntry} from '../rename-entry'

describe('renameEntry', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-rename-')))
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src/main.ts'), 'original')
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  const rename = async (path: string, name: string) => {
    const source = await readEntry({path, root})
    if (!source.ok) {
      return source
    }
    return renameEntry({name, path, revision: source.value.revision, root})
  }
  it('should rename a file beside its source and retain its contents', async () => {
    expect(await rename('src/main.ts', 'helper.ts')).toMatchObject({
      ok: true,
      value: {kind: 'file', path: 'src/helper.ts'},
    })
    expect(existsSync(join(root, 'src/main.ts'))).toBe(false)
    expect(readFileSync(join(root, 'src/helper.ts'), 'utf8')).toBe('original')
  })
  it('should rename a folder with nested files and empty directories', async () => {
    mkdirSync(join(root, 'src/empty'))
    expect(await rename('src', 'source')).toMatchObject({
      ok: true,
      value: {kind: 'directory', path: 'source'},
    })
    expect(existsSync(join(root, 'src'))).toBe(false)
    expect(readFileSync(join(root, 'source/main.ts'), 'utf8')).toBe('original')
    expect(existsSync(join(root, 'source/empty'))).toBe(true)
  })
  it('should reject an existing destination without changing either entry', async () => {
    writeFileSync(join(root, 'src/helper.ts'), 'existing')
    expect(await rename('src/main.ts', 'helper.ts')).toMatchObject({
      error: {code: 'already-exists'},
      ok: false,
    })
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
    expect(readFileSync(join(root, 'src/helper.ts'), 'utf8')).toBe('existing')
  })
  it.each([
    '',
    '.',
    '..',
    '../escape.ts',
    'nested/name.ts',
    'nested\\name.ts',
    '.git',
    'bad:name',
    'a'.repeat(256),
  ])('should reject invalid name %s', async (name) => {
    expect(await rename('src/main.ts', name)).toMatchObject({
      error: {code: 'invalid-name'},
      ok: false,
    })
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
  })
  it('should treat an unchanged name as a successful no-op', async () => {
    expect(await rename('src/main.ts', 'main.ts')).toMatchObject({
      ok: true,
      value: {path: 'src/main.ts'},
    })
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
  })
  it('should refuse stale revisions and protected paths', async () => {
    const source = await readEntry({path: 'src/main.ts', root})
    if (!source.ok) {
      throw new Error(source.error.code)
    }
    writeFileSync(join(root, 'src/main.ts'), 'changed content')
    expect(
      await renameEntry({
        name: 'helper.ts',
        path: source.value.path,
        revision: source.value.revision,
        root,
      }),
    ).toMatchObject({error: {code: 'entry-changed'}, ok: false})
    symlinkSync(join(root, 'src/main.ts'), join(root, 'linked.ts'))
    expect(
      await renameEntry({name: 'other.ts', path: 'linked.ts', revision: '', root}),
    ).toMatchObject({ok: false})
    expect(await renameEntry({name: 'other', path: '', revision: '', root})).toMatchObject({
      ok: false,
    })
    expect(existsSync(join(root, 'src/helper.ts'))).toBe(false)
  })
})
