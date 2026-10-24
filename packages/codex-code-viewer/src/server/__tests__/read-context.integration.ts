import {mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readContext} from '../read-context'

describe('readContext', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-context-')))
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it('should bound source ranges and support subsequent ranges', async () => {
    writeFileSync(
      join(root, 'main.ts'),
      Array.from({length: 250}, (_, index) => `line ${index + 1}`).join('\n'),
    )
    const first = await readContext({endLine: 250, path: 'main.ts', root})
    expect(first).toMatchObject({
      ok: true,
      value: {text: expect.stringContaining('line 200\n[More lines available]')},
    })
    expect(first).not.toMatchObject({value: {text: expect.stringContaining('line 201')}})
    expect(await readContext({line: 249, path: 'main.ts', root})).toMatchObject({
      value: {text: expect.stringContaining('line 249\nline 250')},
    })
    expect(await readContext({line: 251, path: 'main.ts', root})).toMatchObject({
      error: {code: 'invalid-position'},
      ok: false,
    })
  })
  it('should list immediate children without exposing ignored folders or following symlinks', async () => {
    mkdirSync(join(root, 'folder'))
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(join(root, 'main.ts'), 'hello')
    symlinkSync(join(root, 'main.ts'), join(root, 'link.ts'))
    const result = await readContext({path: root, root})
    expect(result).toMatchObject({value: {text: expect.stringContaining('folder/')}})
    expect(result).toMatchObject({value: {text: expect.stringContaining('main.ts')}})
    expect(result).not.toMatchObject({value: {text: expect.stringContaining('node_modules')}})
    expect(result).not.toMatchObject({value: {text: expect.stringContaining('link.ts')}})
  })
  it('should report large contexts rather than silently truncate a long line', async () => {
    writeFileSync(join(root, 'long.ts'), 'a'.repeat(70 * 1024))
    expect(await readContext({path: 'long.ts', root})).toMatchObject({
      error: {code: 'context-too-large'},
      ok: false,
    })
  })
  it('should reject private folders, traversal, and directory aliases', async () => {
    mkdirSync(join(root, '.ssh'))
    mkdirSync(join(root, 'folder'))
    symlinkSync(join(root, 'folder'), join(root, 'alias'))
    expect(await readContext({path: '.ssh', root})).toMatchObject({ok: false})
    expect(await readContext({path: '..', root})).toMatchObject({ok: false})
    expect(await readContext({path: 'alias', root})).toMatchObject({ok: false})
    expect(await readContext({path: 'missing.ts', root})).toMatchObject({ok: false})
  })
})
