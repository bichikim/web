import {describe, expect, it} from 'vitest'
import {tokenizeSyntax} from '../tokenize-syntax'

describe('tokenizeSyntax', () => {
  it('should highlight Ruby and expose require paths, constants, methods and instance variables', () => {
    const source = [
      "require 'reports/models'\r\nrequire_relative('helpers')\n",
      'module Reports\n  class Report\n    def render!\n',
      '      @title = "한글 🦊"\n      ready? && render! # render! stays a comment\n',
      '    end\n  end\nend\n',
      'Reports::Report.new.render!\n',
    ].join('')
    const lines = tokenizeSyntax('ruby', source)
    const tokens = lines.flat()
    expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
      source.split(/\r\n|\n|\r/u),
    )
    for (const text of ['Reports', 'Report', 'render!', 'ready?', '@title']) {
      const matches = tokens.filter((token) => token.text === text)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every((token) => token.navigation === 'definition')).toBe(true)
    }
    expect(
      tokens.filter((token) => token.navigation === 'path').map((token) => token.text),
    ).toEqual(['reports/models', 'helpers'])
    expect(tokens).toContainEqual(expect.objectContaining({kind: 'keyword', text: 'module'}))
    expect(tokens.find((token) => token.text === '"한글 🦊"')?.navigation).toBeNull()
    expect(
      tokens
        .filter((token) => token.kind === 'comment')
        .every((token) => token.navigation === null),
    ).toBe(true)
    for (const token of tokens) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
    }
  })
  it('should keep Ruby strings, regexes and comments from creating require links', () => {
    const source = [
      '# require "secret"\n',
      'text = %q{require "secret"}\n',
      'pattern = /Report/\n',
      'text = "require \'secret\'"\n',
      'require_relative "#{name}"\n',
    ].join('')
    const tokens = tokenizeSyntax('ruby', source).flat()
    expect(tokens.filter((token) => token.navigation === 'path')).toEqual([])
    expect(
      tokens.filter((token) => token.text === 'Report').every((token) => token.navigation === null),
    ).toBe(true)
  })
  it('should highlight Python and expose imports, aliases, classes and Unicode identifiers at UTF-16 offsets', () => {
    const source = [
      'from .helpers import 인사 as welcome\r\n',
      'class Report:\n    def render(self):\n',
      '        변수 = "🦊"\n        return welcome(변수) # welcome stays a comment\n',
    ].join('')
    const lines = tokenizeSyntax('python', source)
    const tokens = lines.flat()
    expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
      source.split(/\r\n|\n|\r/u),
    )
    for (const text of ['helpers', '인사', 'welcome', 'Report', 'render', 'self', '변수']) {
      expect(
        tokens
          .filter((token) => token.text === text)
          .every((token) => token.navigation === 'definition'),
      ).toBe(true)
      expect(tokens.some((token) => token.text === text)).toBe(true)
    }
    expect(tokens).toContainEqual(
      expect.objectContaining({kind: 'keyword', navigation: null, text: 'from'}),
    )
    expect(
      tokens
        .filter((token) => token.kind === 'string' || token.kind === 'comment')
        .every((token) => token.navigation === null),
    ).toBe(true)
    for (const token of tokens) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
    }
  })
  it('should color HTML markup and embedded JavaScript without changing text positions', () => {
    const source = [
      '<!doctype html>\r\n',
      '<!-- 한글 🦊 -->\n',
      '<a class="card">&amp;</a>\r\n',
      '<script>const count = 2; throw new Error("source only");</script>',
    ].join('')
    const lines = tokenizeSyntax('html', source)
    const tokens = lines.flat()
    expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
      source.split(/\r\n|\n|\r/u),
    )
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({kind: 'comment', text: '<!-- 한글 🦊 -->'}),
        expect.objectContaining({kind: 'keyword', text: 'a'}),
        expect.objectContaining({kind: 'keyword', text: 'class'}),
        expect.objectContaining({kind: 'string', text: 'card'}),
        expect.objectContaining({kind: 'string', text: '&amp;'}),
        expect.objectContaining({kind: 'keyword', text: 'const'}),
        expect.objectContaining({kind: 'number', text: '2'}),
      ]),
    )
    for (const token of tokens) {
      expect(token.navigation).toBeNull()
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
    }
  })
  it.each([
    [
      'rust',
      'fn main() { let value = r###"한글 🦊"###; /* outer /* inner */ end */ }',
      'fn',
      'keyword',
    ],
    ['yaml', 'name: "한글"\nbody: |\n  hello\n  world\n# comment', '# comment', 'comment'],
    ['toml', '# Generated\nversion = 4\n[[package]]\nname = "hello"', '4', 'number'],
    ['json', '{"name": "hello", "enabled": true}', 'true', 'keyword'],
    ['jsonc', '{\n// comment\n"enabled": true,\n}', '// comment', 'comment'],
    ['json5', "{unquoted: 'hello', count: 0xff,}", "'hello'", 'string'],
  ] as const)(
    'should highlight %s without offering TypeScript navigation',
    (language, source, text, kind) => {
      const lines = tokenizeSyntax(language, source)
      const tokens = lines.flat()
      expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
        source.split('\n'),
      )
      expect(tokens).toContainEqual(expect.objectContaining({kind, text}))
      expect(
        tokens.filter((token) => token.navigation !== null).every((token) => language === 'rust'),
      ).toBe(true)
    },
  )

  it.each([
    ['css', '/* viewer */\r\n.card { color: red; content: "한글 🦊"; }', 'color', 'keyword'],
    ['scss', '$accent: red;\r\n.card { color: $accent; content: "한글 🦊"; }', 'color', 'keyword'],
    ['sass', '$accent: red\r\n.card\n  color: $accent\n  content: "한글 🦊"', 'color', 'keyword'],
    ['less', '@accent: red;\r\n.card { color: @accent; content: "한글 🦊"; }', 'color', 'keyword'],
    [
      'vue',
      [
        '<script setup lang="ts">const title = "한글 🦊";</script>\r\n',
        '<template><h1>{{ title }}</h1></template>',
        '<style>.card { color: red; }</style>',
      ].join(''),
      'const',
      'keyword',
    ],
    [
      'svelte',
      [
        '<script lang="ts">const title = "한글 🦊";</script>\r\n',
        '{#if title}<h1>{title}</h1>{/if}',
        '<style>.card { color: red; }</style>',
      ].join(''),
      'const',
      'keyword',
    ],
    [
      'astro',
      '---\r\nconst title: string = "한글 🦊";\r\n---\n<h1>{title}</h1><style>.card { color: red; }</style>',
      'const',
      'keyword',
    ],
    ['xml', '<?xml version="1.0"?>\r\n<viewer name="한글 🦊">hello</viewer>', 'viewer', 'keyword'],
    ['ini', '; 한글 🦊\r\n[viewer]\nname=viewer', 'name', 'keyword'],
    ['properties', '! 한글 🦊\r\nname=viewer', 'name', 'keyword'],
  ] as const)(
    'should highlight %s in reading mode and preserve source offsets',
    (language, source, text, kind) => {
      const lines = tokenizeSyntax(language, source)
      const tokens = lines.flat()
      expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
        source.split(/\r\n|\n|\r/u),
      )
      expect(tokens).toContainEqual(expect.objectContaining({kind, text}))
      if (['ini', 'properties'].includes(language)) {
        expect(tokens).toContainEqual(expect.objectContaining({kind: 'string', text: 'viewer'}))
      }
      if (['vue', 'svelte', 'astro'].includes(language)) {
        expect(tokens).toEqual(
          expect.arrayContaining([
            expect.objectContaining({kind: 'keyword', text: 'h1'}),
            expect.objectContaining({kind: 'keyword', text: 'color'}),
          ]),
        )
      }
      for (const token of tokens) {
        expect(token.navigation).toBeNull()
        expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
      }
    },
  )

  it('should keep Rust raw strings and nested comments intact', () => {
    const source = 'let text = r###"// 🦊"###; /* outer /* nested */ end */'
    const tokens = tokenizeSyntax('rust', source).flat()
    expect(
      tokens
        .filter((token) => token.kind === 'string')
        .map((token) => token.text)
        .join(''),
    ).toBe('r###"// 🦊"###')
    expect(
      tokens
        .filter((token) => token.kind === 'comment')
        .map((token) => token.text)
        .join(''),
    ).toBe('/* outer /* nested */ end */')
    expect(
      tokens
        .filter((token) => token.kind === 'string' || token.kind === 'comment')
        .every((token) => token.navigation === null),
    ).toBe(true)
  })

  it('should make Rust modules, aliases, calls and local bindings navigable at their UTF-16 offsets', () => {
    const source =
      'mod math;\r\nuse math::answer as value;\nfn main() { let 변수 = "🦊"; value(); 변수; }'
    const tokens = tokenizeSyntax('rust', source).flat()
    for (const text of ['math', 'answer', 'value', '변수']) {
      const matches = tokens.filter((token) => token.text === text)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every((token) => token.navigation === 'definition')).toBe(true)
    }
    for (const token of tokens) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
    }
    expect(tokens.find((token) => token.text === 'fn')?.navigation).toBeNull()
  })

  it('should preserve raw identifiers without splitting their keyword names', () => {
    const tokens = tokenizeSyntax('rust', 'fn r#type() {} fn main() { r#type(); }').flat()
    expect(tokens.filter((token) => token.text === 'r#type')).toHaveLength(2)
    expect(
      tokens
        .filter((token) => token.text === 'r#type')
        .every((token) => token.navigation === 'definition'),
    ).toBe(true)
  })

  it('should preserve UTF-16 positions across mixed newlines and multiline tokens', () => {
    const source = 'name: "🦊"\r\nbody: |\n  한글\r  text\r\n'
    const lines = tokenizeSyntax('yaml', source)
    expect(lines.map((line) => line.map((token) => token.text).join(''))).toEqual(
      source.split(/\r\n|\n|\r/u),
    )
    for (const token of lines.flat()) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text)
    }
    expect(lines[2][0].offset).toBe(source.indexOf('  한글'))
    expect(lines[3][0].offset).toBe(source.indexOf('  text'))
  })
  it.each(['json', 'jsonc', 'json5'] as const)(
    'should mark only file path values as navigable in %s reading mode',
    (language) => {
      const source = '{"extends":"./base.json","label":"hello","comment":"https://example.com"}'
      const tokens = tokenizeSyntax(language, source).flat()
      expect(tokens.filter((token) => token.navigation !== null)).toEqual([
        expect.objectContaining({navigation: 'path', text: '"./base.json"'}),
      ])
    },
  )
})
