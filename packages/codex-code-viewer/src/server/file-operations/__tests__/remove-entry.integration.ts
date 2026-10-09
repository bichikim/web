import {existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readEntry} from '../read-entry'
import {removeEntry} from '../remove-entry'

describe('removeEntry', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-remove-')))
    mkdirSync(join(root, 'src'))
    writeFileSync(join(root, 'src/main.ts'), 'original')
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  const revision = async (path: string): Promise<string> => {
    const result = await readEntry({path, root})
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    return result.value.revision
  }
  it('should delete a confirmed directory and its children', async () => {
    expect(await removeEntry({path: 'src', revision: await revision('src'), root})).toMatchObject({
      ok: true,
      value: {path: 'src'},
    })
    expect(existsSync(join(root, 'src'))).toBe(false)
  })
  it('should reject changes to nested files after confirmation was requested', async () => {
    const previous = await revision('src')
    writeFileSync(join(root, 'src/main.ts'), 'changed since confirmation')
    expect(await removeEntry({path: 'src', revision: previous, root})).toMatchObject({
      error: {code: 'entry-changed'},
      ok: false,
    })
    expect(existsSync(join(root, 'src/main.ts'))).toBe(true)
  })
  it('should refuse workspace-root and protected-directory deletion', async () => {
    mkdirSync(join(root, '.git'))
    await Promise.all(
      ['', root, '.git', '../outside'].map(async (path) => {
        expect(await removeEntry({path, revision: '', root})).toMatchObject({
          error: {code: 'outside-workspace'},
          ok: false,
        })
      }),
    )
    expect(existsSync(join(root, '.git'))).toBe(true)
  })
})
