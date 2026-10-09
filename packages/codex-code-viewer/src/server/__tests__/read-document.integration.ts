import {mkdirSync, mkdtempSync, realpathSync, rmSync, truncateSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readDocument} from '../read-document'

describe('readDocument', () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-document-')))
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it.each([
    [
      'report.docx',
      'word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [
      'workbook.XLSX',
      'spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  ])('should open %s as a binary document with a transferable revision', (path, kind, mimeType) => {
    writeFileSync(join(root, path), Buffer.from([80, 75, 0, 255]))
    const result = readDocument(root, path)
    expect(result).toMatchObject({
      ok: true,
      value: {lines: [[]], media: {kind, mimeType, size: 4}, source: ''},
    })
    if (result.ok) {
      expect(result.value.revision).not.toBe('')
    }
  })
  it.each([
    ['main.rs', 'fn main() {}', 'fn', 'keyword'],
    ['main.rb', 'class Report\nend', 'class', 'keyword'],
    ['MAIN.RB', 'module Reports\nend', 'module', 'keyword'],
    ['tasks.rake', 'def build\nend', 'def', 'keyword'],
    ['viewer.gemspec', 'if true\nend', 'if', 'keyword'],
    ['Gemfile', "source 'https://rubygems.org'\nif true\nend", 'if', 'keyword'],
    ['Rakefile', 'def build\nend', 'def', 'keyword'],
    ['Cargo.lock', '# Generated\nversion = 4', '4', 'number'],
    ['Cargo.toml', '[package]\nname = "hello"', '"hello"', 'string'],
    ['config.yaml', '# comment\nname: hello', '# comment', 'comment'],
    ['config.yml', 'enabled: true', 'true', 'keyword'],
    ['config.jsonc', '{// comment\n"name": "hello",}', '// comment', 'comment'],
    ['config.json5', "{name: 'hello',}", "'hello'", 'string'],
    ['index.html', '<h1 class="title">HTML 원문</h1>', 'h1', 'keyword'],
    ['index.htm', '<h1>HTML 원문</h1>', 'h1', 'keyword'],
    ['INDEX.HTML', '<h1>HTML 원문</h1>', 'h1', 'keyword'],
  ])('should read and highlight %s at the requested location', (path, source, text, kind) => {
    writeFileSync(join(root, path), source)
    const result = readDocument(root, path, 1, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.value.location).toEqual({column: 3, line: 1, path})
    expect(result.value.source).toBe(source)
    expect(result.value.lines.flat()).toContainEqual(
      expect.objectContaining({kind, navigation: null, text}),
    )
  })
  it('should expose highlighted SVG source alongside media with its transfer revision', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg">\n<path d="M0 0"/>\n</svg>'
    writeFileSync(join(root, 'icon.svg'), source)
    const result = readDocument(root, 'icon.svg', 2, 3)
    expect(result).toMatchObject({
      ok: true,
      value: {
        location: {column: 3, line: 2, path: 'icon.svg'},
        media: {kind: 'image', mimeType: 'image/svg+xml'},
        source,
      },
    })
    if (result.ok) {
      expect(result.value.lines.flat()).toContainEqual(
        expect.objectContaining({kind: 'keyword', text: 'path'}),
      )
    }
  })
  it('should preserve image-only preview for SVG larger than the source limit', () => {
    writeFileSync(join(root, 'large.svg'), `<svg>${' '.repeat(524288)}</svg>`)
    expect(readDocument(root, 'large.svg')).toMatchObject({
      ok: true,
      value: {media: {mimeType: 'image/svg+xml'}, source: ''},
    })
  })
  it('should read other lock files as plain text instead of TOML', () => {
    writeFileSync(join(root, 'dependency.lock'), 'version = 4')
    expect(readDocument(root, 'dependency.lock')).toMatchObject({
      ok: true,
      value: {lines: [[{kind: 'plain', navigation: null, text: 'version = 4'}]]},
    })
  })
  it.each(['md', 'mdx', 'txt'])(
    'should preserve %s text and line offsets without code navigation',
    (extension) => {
      const source = '한글 문서\r\nimport example\n'
      const path = `document.${extension}`
      writeFileSync(join(root, path), source)
      expect(readDocument(root, path, 2, 3)).toMatchObject({
        ok: true,
        value: {
          lines: [
            [{kind: 'plain', navigation: null, offset: 0, text: '한글 문서'}],
            [{kind: 'plain', navigation: null, offset: 7, text: 'import example'}],
            [{kind: 'plain', navigation: null, offset: 22, text: ''}],
          ],
          location: {column: 3, line: 2, path},
          source,
        },
      })
    },
  )
  it.each([
    '.dockerignore',
    '.gitignore',
    '.editorconfig',
    'Dockerfile',
    'Makefile',
    'settings.custom',
  ])('should read %s as plain source text', (path) => {
    const source = '<script>throw new Error("execute")</script>\r\n한글 설정\n'
    writeFileSync(join(root, path), source)
    expect(readDocument(root, path, 2, 3)).toMatchObject({
      ok: true,
      value: {
        lines: expect.arrayContaining([
          [
            expect.objectContaining({
              kind: 'plain',
              navigation: null,
              text: '<script>throw new Error("execute")</script>',
            }),
          ],
        ]),
        location: {column: 3, line: 2, path},
        source,
      },
    })
  })
  it.each([Buffer.from([0, 1, 2]), Buffer.from([255, 254, 65])])(
    'should reject binary bytes in an unrecognized file format',
    (bytes) => {
      writeFileSync(join(root, 'unknown.data'), bytes)
      expect(readDocument(root, 'unknown.data')).toMatchObject({
        error: {code: 'unsupported-file'},
        ok: false,
      })
    },
  )
  it('should keep unlisted hidden files and private directories inaccessible', () => {
    writeFileSync(join(root, '.env'), 'TOKEN=value')
    mkdirSync(join(root, '.git'))
    writeFileSync(join(root, '.git', 'config'), 'config')
    expect(readDocument(root, '.env')).toMatchObject({error: {code: 'unsupported-file'}, ok: false})
    expect(readDocument(root, '.git/config')).toMatchObject({
      error: {code: 'outside-workspace'},
      ok: false,
    })
  })
  it.each([
    ['png', 'image', 'image/png'],
    ['pdf', 'pdf', 'application/pdf'],
    ['mp4', 'video', 'video/mp4'],
    ['mp3', 'audio', 'audio/mpeg'],
    ['wav', 'audio', 'audio/wav'],
    ['m4a', 'audio', 'audio/mp4'],
    ['aac', 'audio', 'audio/aac'],
    ['ogg', 'audio', 'audio/ogg'],
    ['oga', 'audio', 'audio/ogg'],
    ['opus', 'audio', 'audio/ogg'],
    ['flac', 'audio', 'audio/flac'],
    ['weba', 'audio', 'audio/webm'],
  ])('should describe %s without decoding binary as text', (extension, kind, mimeType) => {
    writeFileSync(join(root, `sample.${extension}`), Buffer.from([0, 1, 2, 255]))
    expect(readDocument(root, `sample.${extension}`)).toMatchObject({
      ok: true,
      value: {
        location: {column: 1, line: 1},
        media: {kind, mimeType, size: 4},
        source: '',
      },
    })
  })
  it('should reject directories and oversized text', () => {
    mkdirSync(join(root, 'folder.png'))
    writeFileSync(join(root, 'large.txt'), 'a'.repeat(524289))
    expect(readDocument(root, 'folder.png')).toMatchObject({
      error: {code: 'unsupported-file'},
      ok: false,
    })
    expect(readDocument(root, 'large.txt')).toMatchObject({error: {code: 'too-large'}, ok: false})
  })
  it('should reject media larger than 128 MiB before transferring any bytes', () => {
    const path = join(root, 'large.mp4')
    writeFileSync(path, '')
    truncateSync(path, 134217729)
    expect(readDocument(root, 'large.mp4')).toMatchObject({
      error: {code: 'media-too-large'},
      ok: false,
    })
  })
})
