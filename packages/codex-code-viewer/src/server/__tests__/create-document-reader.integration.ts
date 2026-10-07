import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as tokenizer from '../tokenize-source'
import {createDocumentReader} from '../create-document-reader'

describe('createDocumentReader', () => {
  let root: string
  let reader: ReturnType<typeof createDocumentReader>
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-reader-')))
    writeFileSync(join(root, 'main.ts'), 'const value = 1\nconst next = 2\n')
    reader = createDocumentReader(root)
  })
  afterEach(() => {
    reader.dispose()
    vi.restoreAllMocks()
    rmSync(root, {force: true, recursive: true})
  })
  it('should reuse tokenization while applying each requested location', () => {
    const tokenize = vi.spyOn(tokenizer, 'tokenizeSource')
    const first = reader.read('main.ts')
    expect(reader.read('main.ts', 2, 3)).toMatchObject({
      ok: true,
      value: {location: {column: 3, line: 2, path: 'main.ts'}},
    })
    expect(reader.read('main.ts', 999)).toMatchObject({ok: true, value: {location: {line: 3}}})
    expect(tokenize).toHaveBeenCalledOnce()
    expect(reader.read('main.ts')).toEqual(first)
  })
  it('should preserve requested SVG source coordinates through the document cache', () => {
    writeFileSync(join(root, 'icon.svg'), '<svg>\n<path/>\n</svg>')
    reader.read('icon.svg')
    expect(reader.read('icon.svg', 2, 3)).toMatchObject({
      ok: true,
      value: {location: {column: 3, line: 2, path: 'icon.svg'}},
    })
  })
  it('should refresh same-size edits even when modification time is restored', () => {
    const first = reader.read('main.ts')
    const path = join(root, 'main.ts')
    const previous = statSync(path)
    writeFileSync(path, readFileSync(path, 'utf8').replace('1', '9'))
    utimesSync(path, previous.atime, previous.mtime)
    const edited = reader.read('main.ts')
    expect(edited).toMatchObject({ok: true, value: {source: 'const value = 9\nconst next = 2\n'}})
    expect(edited).not.toEqual(first)
  })
  it('should reject deleted or replaced files rather than returning cached content', () => {
    reader.read('main.ts')
    rmSync(join(root, 'main.ts'))
    expect(reader.read('main.ts')).toMatchObject({error: {code: 'not-found'}, ok: false})
    writeFileSync(join(root, 'main.ts'), Buffer.from([0, 255]))
    expect(reader.read('main.ts')).toMatchObject({error: {code: 'unsupported-file'}, ok: false})
  })
  it('should bound recent documents and clear them on disposal', () => {
    const tokenize = vi.spyOn(tokenizer, 'tokenizeSource')
    reader.read('main.ts')
    for (let item = 0; item < 8; item += 1) {
      const path = `other-${item}.ts`
      writeFileSync(join(root, path), 'const other = 1')
      reader.read(path)
    }
    reader.read('main.ts')
    expect(tokenize).toHaveBeenCalledTimes(10)
    reader.dispose()
    reader.read('main.ts')
    expect(tokenize).toHaveBeenCalledTimes(11)
  })
})
