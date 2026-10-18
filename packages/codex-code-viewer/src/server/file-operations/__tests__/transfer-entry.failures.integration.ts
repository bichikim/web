import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {copyFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {readEntry} from '../read-entry'
import {transferEntry} from '../transfer-entry'

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {...actual, copyFile: vi.fn(actual.copyFile), rm: vi.fn(actual.rm)}
})
describe('transferEntry failure recovery', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-transfer-failure-')))
    mkdirSync(join(root, 'src'))
    mkdirSync(join(root, 'dest'))
    writeFileSync(join(root, 'src/main.ts'), 'original')
  })
  afterEach(() => {
    vi.mocked(copyFile).mockClear()
    vi.mocked(rm).mockClear()
    rmSync(root, {force: true, recursive: true})
  })
  const transfer = async () => {
    const snapshot = await readEntry({path: 'src', root})
    if (!snapshot.ok) {
      throw new Error(snapshot.error.code)
    }
    return transferEntry({
      action: 'cut',
      parent: 'dest',
      path: 'src',
      revision: snapshot.value.revision,
      root,
    })
  }
  it('should remove an incomplete destination and retain the source when copying fails', async () => {
    vi.mocked(copyFile).mockRejectedValueOnce(new Error('disk full'))
    expect(await transfer()).toMatchObject({error: {code: 'file-operation-failed'}, ok: false})
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
    expect(existsSync(join(root, 'dest/src'))).toBe(false)
  })
  it('should retain the complete destination when removing the source fails', async () => {
    vi.mocked(rm).mockRejectedValueOnce(new Error('permission denied'))
    expect(await transfer()).toMatchObject({error: {code: 'file-operation-failed'}, ok: false})
    expect(readFileSync(join(root, 'dest/src/main.ts'), 'utf8')).toBe('original')
    expect(readFileSync(join(root, 'src/main.ts'), 'utf8')).toBe('original')
  })
  it('should populate a read-only source directory before restoring its permissions', async () => {
    chmodSync(join(root, 'src'), 0o555)
    try {
      const source = await readEntry({path: 'src', root})
      if (!source.ok) {
        throw new Error(source.error.code)
      }
      expect(
        await transferEntry({
          action: 'copy',
          parent: 'dest',
          path: 'src',
          revision: source.value.revision,
          root,
        }),
      ).toMatchObject({ok: true})
      expect(readFileSync(join(root, 'dest/src/main.ts'), 'utf8')).toBe('original')
      expect(statSync(join(root, 'dest/src')).mode % 0o1000).toBe(0o555)
    } finally {
      chmodSync(join(root, 'src'), 0o755)
      if (existsSync(join(root, 'dest/src'))) {
        chmodSync(join(root, 'dest/src'), 0o755)
      }
    }
  })
})
