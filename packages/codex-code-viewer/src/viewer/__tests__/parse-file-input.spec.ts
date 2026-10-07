import {describe, expect, it} from 'vitest'
import {parseFileInput} from '../parse-file-input'

describe('parseFileInput', () => {
  it.each([
    'md',
    'mdx',
    'txt',
    'png',
    'webp',
    'mp4',
    'webm',
    'JPG',
    'rs',
    'yaml',
    'yml',
    'toml',
    'jsonc',
    'json5',
    'lock',
  ])('should open a %s path instead of searching', (extension) => {
    const path = `/project/My Folder/example.${extension}`
    expect(parseFileInput(path)).toEqual({
      kind: 'path',
      location: {column: 1, line: 1, path},
      restoreView: true,
    })
  })
  it.each([
    './index.html',
    '/project/.dockerignore',
    './Dockerfile',
    'config/settings.custom',
    '/project/extensionless:2:3',
  ])('should open the general text path %s', (input) => {
    const positioned = input.endsWith(':2:3')
    expect(parseFileInput(input)).toEqual({
      kind: 'path',
      location: {
        column: positioned ? 3 : 1,
        line: positioned ? 2 : 1,
        path: positioned ? '/project/extensionless' : input,
      },
      restoreView: !positioned,
    })
  })

  it.each([
    ['위치: (/project/.dockerignore:3)', '/project/.dockerignore', 3],
    ['위치: (config/Dockerfile:2)', 'config/Dockerfile', 2],
  ])('should extract a general text address from %s', (input, path, line) => {
    expect(parseFileInput(input)).toEqual({
      kind: 'path',
      location: {column: 1, line, path},
      restoreView: false,
    })
  })

  it('should search for a filename or keyword without a path', () => {
    expect(parseFileInput(' PuppetEditor.tsx ')).toEqual({
      kind: 'search',
      query: 'PuppetEditor.tsx',
    })
  })
  it('should open a repository relative file path', () => {
    expect(parseFileInput('packages/puppet/src/main.tsx')).toEqual({
      kind: 'path',
      location: {column: 1, line: 1, path: 'packages/puppet/src/main.tsx'},
      restoreView: true,
    })
  })
  it('should read the line and column from an absolute path containing spaces', () => {
    expect(parseFileInput('/Users/bichi/My Project/src/main.tsx:8:14')).toEqual({
      kind: 'path',
      location: {column: 14, line: 8, path: '/Users/bichi/My Project/src/main.tsx'},
      restoreView: false,
    })
  })
  it('should extract a file address from pasted surrounding text', () => {
    expect(parseFileInput('오류 위치: (packages/puppet/src/main.tsx:8:1)')).toEqual({
      kind: 'path',
      location: {column: 1, line: 8, path: 'packages/puppet/src/main.tsx'},
      restoreView: false,
    })
  })
  it('should support a quoted path and default a missing column to one', () => {
    expect(parseFileInput('"./src/main.tsx:8"')).toEqual({
      kind: 'path',
      location: {column: 1, line: 8, path: './src/main.tsx'},
      restoreView: false,
    })
  })
  it('should search for a partial directory path', () => {
    expect(parseFileInput('puppet/editor')).toEqual({kind: 'search', query: 'puppet/editor'})
  })

  it('should recognize a relative path beginning with a Unicode directory', () => {
    expect(parseFileInput('한글/파일.tsx:3')).toEqual({
      kind: 'path',
      location: {column: 1, line: 3, path: '한글/파일.tsx'},
      restoreView: false,
    })
  })

  it('should recognize directory punctuation outside the path delimiters', () => {
    expect(parseFileInput('apps+tools/main.tsx')).toEqual({
      kind: 'path',
      location: {column: 1, line: 1, path: 'apps+tools/main.tsx'},
      restoreView: true,
    })
  })

  it('should preserve a quoted path containing spaces in surrounding text', () => {
    expect(parseFileInput('위치: "/Users/bichi/My Project/main.tsx:8:1"')).toEqual({
      kind: 'path',
      location: {column: 1, line: 8, path: '/Users/bichi/My Project/main.tsx'},
      restoreView: false,
    })
  })

  it('should preserve spaces in the first directory of a quoted relative path', () => {
    expect(parseFileInput('위치: "My Project/main.tsx:8:1"')).toEqual({
      kind: 'path',
      location: {column: 1, line: 8, path: 'My Project/main.tsx'},
      restoreView: false,
    })
  })
})
