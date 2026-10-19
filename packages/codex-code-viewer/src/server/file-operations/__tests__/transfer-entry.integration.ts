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
import {transferEntry} from '../transfer-entry'

describe('transferEntry', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-transfer-')))
    mkdirSync(join(root, 'src'))
    mkdirSync(join(root, 'dest'))
    writeFileSync(join(root, 'src/main.ts'), 'original')
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  const snapshot = async (path: string) => {
    const result = await readEntry({path, root})
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    return result.value
  }
  it('should copy a file repeatedly in its own directory without overwriting any file', async () => {
    const source = await snapshot('src/main.ts')
    await ['src/main 복사본.ts', 'src/main 복사본 2.ts'].reduce(async (previous, path) => {
      await previous
      expect(
        await transferEntry({
          action: 'copy',
          parent: 'src',
          path: source.path,
          revision: source.revision,
          root,
        }),
      ).toMatchObject({ok: true, value: {path}})
      expect(readFileSync(join(root, path), 'utf8')).toBe('original')
    }, Promise.resolve())
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
  })
  it('should copy nested directories and empty directories, then move only after a complete copy', async () => {
    mkdirSync(join(root, 'src/empty'))
    const source = await snapshot('src')
    expect(
      await transferEntry({
        action: 'cut',
        parent: 'dest',
        path: source.path,
        revision: source.revision,
        root,
      }),
    ).toMatchObject({ok: true, value: {kind: 'directory', path: 'dest/src'}})
    expect(existsSync(join(root, 'src'))).toBe(false)
    expect(readFileSync(join(root, 'dest/src/main.ts'), 'utf8')).toBe('original')
    expect(existsSync(join(root, 'dest/src/empty'))).toBe(true)
  })
  it('should retain the source when a move destination exists or is inside the source', async () => {
    const source = await snapshot('src')
    mkdirSync(join(root, 'dest/src'))
    expect(
      await transferEntry({
        action: 'cut',
        parent: 'dest',
        path: source.path,
        revision: source.revision,
        root,
      }),
    ).toMatchObject({error: {code: 'already-exists'}, ok: false})
    expect(
      await transferEntry({
        action: 'copy',
        parent: 'src',
        path: source.path,
        revision: source.revision,
        root,
      }),
    ).toMatchObject({error: {code: 'invalid-destination'}, ok: false})
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
  })
  it('should reject stale content and protect paths outside the workspace', async () => {
    const source = await snapshot('src/main.ts')
    writeFileSync(join(root, source.path), 'new content')
    expect(
      await transferEntry({
        action: 'cut',
        parent: 'dest',
        path: source.path,
        revision: source.revision,
        root,
      }),
    ).toMatchObject({error: {code: 'entry-changed'}, ok: false})
    expect(
      await transferEntry({
        action: 'copy',
        parent: '..',
        path: source.path,
        revision: source.revision,
        root,
      }),
    ).toMatchObject({error: {code: 'outside-workspace'}, ok: false})
    expect(existsSync(join(root, 'dest/main.ts'))).toBe(false)
  })
  it('should reject symbolic links and folders containing protected metadata', async () => {
    symlinkSync('/etc', join(root, 'src/linked'))
    expect(await readEntry({path: 'src', root})).toMatchObject({
      error: {code: 'protected-entry'},
      ok: false,
    })
    rmSync(join(root, 'src/linked'))
    mkdirSync(join(root, 'src/.git'))
    expect(await readEntry({path: 'src', root})).toMatchObject({
      error: {code: 'protected-entry'},
      ok: false,
    })
    expect(await readEntry({path: root, root})).toMatchObject({
      error: {code: 'outside-workspace'},
      ok: false,
    })
  })
})
