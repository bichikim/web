import {mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readDocument} from '../read-document'
import {readMedia} from '../read-media'

describe('readMedia', () => {
  let root: string
  let revision: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-media-')))
    writeFileSync(join(root, 'sample.png'), Buffer.from([0, 1, 2, 255]))
    const result = readDocument(root, 'sample.png')
    if (!result.ok) {
      throw new Error('fixture failed')
    }
    revision = result.value.revision
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it('should read bounded chunks with an exact next byte offset', () => {
    expect(readMedia({length: 2, offset: 0, path: 'sample.png', revision, root})).toEqual({
      ok: true,
      value: {data: 'AAE=', next: 2},
    })
    expect(readMedia({length: 2, offset: 2, path: 'sample.png', revision, root})).toEqual({
      ok: true,
      value: {data: 'Av8=', next: 4},
    })
  })
  it('should transfer SVG bytes using the revision provided with highlighted source', () => {
    const source = '<svg><path/></svg>'
    writeFileSync(join(root, 'icon.svg'), source)
    const document = readDocument(root, 'icon.svg')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    expect(
      readMedia({
        length: source.length,
        offset: 0,
        path: 'icon.svg',
        revision: document.value.revision,
        root,
      }),
    ).toEqual({
      ok: true,
      value: {data: Buffer.from(source).toString('base64'), next: source.length},
    })
  })
  it('should reject changed media and invalid byte positions', () => {
    expect(readMedia({length: 2, offset: 5, path: 'sample.png', revision, root})).toMatchObject({
      error: {code: 'invalid-position'},
      ok: false,
    })
    writeFileSync(join(root, 'sample.png'), Buffer.from([3, 4, 5]))
    expect(readMedia({length: 2, offset: 0, path: 'sample.png', revision, root})).toMatchObject({
      error: {code: 'stale-document'},
      ok: false,
    })
  })
  it('should reject text and media escaping the workspace', () => {
    writeFileSync(join(root, 'sample.txt'), 'hello')
    symlinkSync('/etc/hosts', join(root, 'escape.png'))
    expect(readMedia({length: 2, offset: 0, path: 'sample.txt', revision, root})).toMatchObject({
      error: {code: 'unsupported-file'},
      ok: false,
    })
    expect(readMedia({length: 2, offset: 0, path: 'escape.png', revision, root})).toMatchObject({
      error: {code: 'outside-workspace'},
      ok: false,
    })
  })
})
