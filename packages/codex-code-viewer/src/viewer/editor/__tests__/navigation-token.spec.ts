import {EditorState} from '@codemirror/state'
import {javascript} from '@codemirror/lang-javascript'
import {createEditorLanguage} from '../create-editor-language'
import {describe, expect, it} from 'vitest'
import {navigationToken} from '../navigation-token'

describe('navigationToken', () => {
  it.each([0, 2, 5])('should navigate a Rust raw identifier at offset %s', (relative) => {
    const doc = 'fn r#type() {}\nfn main() { r#type(); }'
    const state = EditorState.create({doc, extensions: createEditorLanguage('main.rs')})
    for (const start of [doc.indexOf('r#type'), doc.lastIndexOf('r#type')]) {
      expect(navigationToken(state, start + relative, 'main.rs')).toEqual({
        kind: 'identifier',
        navigation: 'definition',
        offset: start + relative,
        text: 'r#type',
      })
    }
  })
  it.each([
    '// r#type',
    '/* r#type */',
    '/* comment\nr#type\n*/',
    'let text = "r#type";',
    'let text = r###"r#type"###;',
  ])('should exclude a Rust raw identifier inside comments and strings: %s', (doc) => {
    const state = EditorState.create({doc, extensions: createEditorLanguage('main.rs')})
    expect(navigationToken(state, doc.indexOf('r#type') + 2, 'main.rs')).toBeNull()
  })
  it.each([
    [
      'main.py',
      'from helper import greet\nprint(greet("hello")) # greet\n',
      'helper',
      'definition',
    ],
    ['main.rb', "require_relative './helper'\ngreet('hello') # greet\n", './helper', 'path'],
    [
      'main.rs',
      'mod helper;\nfn main() { helper::greet("hello"); } // greet\n',
      'helper',
      'definition',
    ],
  ])(
    'should navigate %s references and exclude strings and comments',
    (path, doc, reference, navigation) => {
      const state = EditorState.create({doc, extensions: createEditorLanguage(path)})
      expect(navigationToken(state, doc.indexOf(reference) + 1, path)).toMatchObject({navigation})
      expect(navigationToken(state, doc.lastIndexOf('greet') + 1, path)).toBeNull()
      expect(navigationToken(state, doc.indexOf('hello') + 1, path)).toBeNull()
    },
  )
  it('should identify an import string and retain source offsets after CRLF lines', () => {
    const source = "// comment\r\nimport {answer} from './helper'\r\nanswer\r\n"
    const state = EditorState.create({
      doc: source,
      extensions: [EditorState.lineSeparator.of('\r\n'), javascript({typescript: true})],
    })
    const position = state.doc.line(2).from + "import {answer} from './hel".length
    expect(navigationToken(state, position, 'main.ts')).toMatchObject({
      navigation: 'path',
      offset: source.indexOf("'./helper'") + 6,
    })
    expect(navigationToken(state, state.doc.line(3).from + 2, 'main.ts')).toMatchObject({
      navigation: 'definition',
      offset: source.lastIndexOf('answer') + 2,
    })
  })
  it('should identify a symbol in an unsaved TSX expression', () => {
    const source = 'export const View = () => <Button />'
    const state = EditorState.create({
      doc: source,
      extensions: [javascript({jsx: true, typescript: true})],
    })
    expect(navigationToken(state, source.indexOf('Button') + 2, 'main.tsx')).toMatchObject({
      navigation: 'definition',
      offset: source.indexOf('Button') + 2,
    })
  })
  it.each(['settings.json', 'settings.jsonc', 'settings.json5'])(
    'should navigate relative path values in %s without treating keys as definitions',
    (path) => {
      const doc = '{"extends":"./base.json","label":"hello"}'
      const state = EditorState.create({doc, extensions: createEditorLanguage(path)})
      expect(navigationToken(state, doc.indexOf('./base') + 2, path)).toMatchObject({
        navigation: 'path',
      })
      expect(navigationToken(state, doc.indexOf('extends') + 1, path)).toBeNull()
      expect(navigationToken(state, doc.indexOf('hello') + 1, path)).toBeNull()
    },
  )
  it.each([
    ['// plain comment', 'plain'],
    ['const message = "hello"', 'hello'],
    [`const message = \`hello \${name}\``, 'hello'],
    ['const count = 42', '42'],
    ['const count = 42', 'const'],
  ])('should keep ordinary editor text available for caret placement: %s', (doc, text) => {
    const state = EditorState.create({doc, extensions: createEditorLanguage('main.ts')})
    expect(navigationToken(state, doc.indexOf(text) + 1, 'main.ts')).toBeNull()
  })
  it.each([
    ["import './helper'", './helper'],
    ["export {answer} from 'package-name'", 'package-name'],
    ["const library = require('package-name')", 'package-name'],
    ["const library = import('package-name')", 'package-name'],
    ["const file = './notes.txt'", './notes.txt'],
  ])('should identify a module or source path: %s', (doc, text) => {
    const state = EditorState.create({doc, extensions: createEditorLanguage('main.js')})
    expect(navigationToken(state, doc.indexOf(text) + 1, 'main.js')).toMatchObject({
      navigation: 'path',
    })
  })
})
