import {EditorState} from '@codemirror/state'
import {language, syntaxTree} from '@codemirror/language'
import {classHighlighter, highlightTree} from '@lezer/highlight'
import {describe, expect, it} from 'vitest'
import {createEditorLanguage} from '../create-editor-language'

describe('createEditorLanguage', () => {
  it.each([
    ['main.py', 'from helper import greet\nmessage = greet("Python")\n'],
    ['main.pyi', 'def greet(name: str) -> str: ...\n'],
    ['main.rb', 'require_relative "helper"\nmessage = greet("Ruby")\n'],
    ['Gemfile', 'source "https://rubygems.org"\ngem "rake"\n'],
    ['Rakefile', 'task :hello do\n  puts "Ruby"\nend\n'],
    ['main.rs', 'mod helper;\nfn main() { helper::greet("Rust"); }\n'],
    ['config.json', '{"name":"viewer","enabled":true,"items":[1,2]}'],
    ['config.jsonc', '// comment\n{"name":"viewer",}'],
    ['config.json5', '{name: "viewer", enabled: true,}'],
    ['main.tsx', 'const component = <div />'],
    ['config.yaml', 'name: viewer\nenabled: true\nitems:\n  - one\n  - two\n'],
    ['config.yml', 'name: viewer\ncount: 2\n'],
    ['config.toml', '[viewer]\nname = "viewer"\nenabled = true\nitems = [1, 2]\n'],
    ['Cargo.lock', 'version = 4\n[[package]]\nname = "viewer"\nversion = "0.1.0"\n'],
    ['index.html', '<!doctype html><html><body><h1>문서</h1></body></html>'],
    ['index.htm', '<div class="viewer"><p>Hello</p></div>'],
  ])('should parse %s with its supported syntax', (path, doc) => {
    const state = EditorState.create({doc, extensions: createEditorLanguage(path)})
    expect(state.facet(language)).not.toBeNull()
    expect(syntaxTree(state).length).toBe(doc.length)
    const errors: string[] = []
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.type.isError) {
          errors.push(node.name)
        }
      },
    })
    expect(errors).toEqual([])
  })
  it('should leave ordinary text free of JavaScript parsing', () => {
    const state = EditorState.create({
      doc: '일반 글: {{ ???',
      extensions: createEditorLanguage('notes.txt'),
    })
    expect(state.facet(language)).toBeNull()
    expect(state.sliceDoc()).toBe('일반 글: {{ ???')
  })
  it.each([
    {
      doc: 'def greet(name):\n  return "Hello " + name\n',
      path: 'main.py',
      token: ['def', 'return', '"Hello "'],
    },
    {
      doc: 'def greet(name)\n  "Hello " + name\nend\n',
      path: 'main.rb',
      token: ['def', 'end', '"Hello "'],
    },
    {
      doc: 'fn greet(name: &str) -> String { format!("Hello {}", name) }\n',
      path: 'main.rs',
      token: ['fn', '"Hello {}"'],
    },
    {doc: 'enabled: true', path: 'config.yaml', token: 'enabled'},
    {doc: 'enabled = true', path: 'config.toml', token: 'true'},
    {doc: '<p>Hello</p>', path: 'index.html', token: 'p'},
    {doc: '/* viewer */ .card { color: red; }', path: 'styles.css', token: 'color'},
    {doc: '$accent: red; .card { color: $accent; }', path: 'styles.scss', token: 'color'},
    {doc: '$accent: red\n.card\n  color: $accent\n', path: 'styles.sass', token: 'color'},
    {doc: '@accent: red; .card { color: @accent; }', path: 'styles.less', token: 'color'},
    {
      doc: [
        '<script setup lang="ts">const title = "viewer";</script>',
        '<template><h1>{{ title }}</h1></template>',
        '<style>.card { color: red; }</style>',
      ].join(''),
      path: 'Panel.vue',
      token: ['const', 'h1', 'color'],
    },
    {
      doc: [
        '<script lang="ts">const title = "viewer";</script>',
        '{#if title}<h1>{title}</h1>{/if}',
        '<style>.card { color: red; }</style>',
      ].join(''),
      path: 'Panel.svelte',
      token: ['const', 'h1', 'color'],
    },
    {
      doc: [
        '---\n',
        'const title: string = "viewer";\n---\n',
        '<h1>{title}</h1>',
        '<style>.card { color: red; }</style>',
      ].join(''),
      path: 'Panel.astro',
      token: ['const', 'h1', 'color'],
    },
    {
      doc: '<?xml version="1.0"?><viewer enabled="true">hello</viewer>',
      path: 'document.xml',
      token: 'viewer',
    },
    {doc: '; comment\n[viewer]\nname=viewer\n', path: 'settings.ini', token: ['name', 'viewer']},
    {doc: '# comment\n[viewer]\nname=viewer\n', path: 'settings.conf', token: ['name', 'viewer']},
    {doc: '[viewer]\nname: viewer\n', path: 'settings.cfg', token: ['name', ' viewer']},
    {doc: '! comment\nname=viewer\n', path: 'settings.properties', token: ['name', 'viewer']},
  ])('should highlight syntax tokens while editing $path', ({doc, path, token}) => {
    const state = EditorState.create({doc, extensions: createEditorLanguage(path)})
    const highlighted: string[] = []
    highlightTree(syntaxTree(state), classHighlighter, (from, to) => {
      highlighted.push(doc.slice(from, to))
    })
    expect(highlighted).toEqual(expect.arrayContaining([token].flat()))
  })
})
