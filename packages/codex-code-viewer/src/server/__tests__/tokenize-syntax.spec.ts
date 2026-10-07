import {describe, expect, it} from 'vitest'
import {tokenizeSyntax} from '../tokenize-syntax'

describe('tokenizeSyntax', () => {
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
})
