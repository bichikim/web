import {ensureSyntaxTree} from '@codemirror/language'
import {describe, expect, it, vi} from 'vitest'
import {readCodeFolds} from '../read-code-folds'

vi.mock(import('@codemirror/language'), async (importOriginal) => {
  const actual = await importOriginal()
  return {...actual, ensureSyntaxTree: vi.fn(actual.ensureSyntaxTree)}
})

const rangesOf = (path: string, source: string) => [
  ...([...readCodeFolds(path, source)].at(-1) ?? []),
]

describe('readCodeFolds', () => {
  it('should yield incomplete parsing and resume with the complete fold ranges', () => {
    vi.mocked(ensureSyntaxTree).mockReturnValueOnce(null)
    const reader = readCodeFolds('main.ts', 'function greet() {\n  return 42\n}\n')
    expect(reader.next()).toEqual({done: false, value: null})
    expect([...reader.next().value!]).toEqual([[1, 2]])
    expect(reader.next().done).toBe(true)
  })
  it.each([
    [
      'main.ts',
      'function greet() {\n  const value = {\n    name: "Kim"\n  }\n  return value\n}\n',
      [
        [1, 5],
        [2, 3],
      ],
    ],
    ['main.tsx', 'const View = () => {\n  return <div>Hello</div>\n}\n', [[1, 2]]],
    [
      'main.js',
      'const value = {\n  items: [\n    1,\n    2\n  ]\n}\n',
      [
        [1, 5],
        [2, 4],
      ],
    ],
    [
      'main.py',
      'def greet():\n    value = {\n        "name": "Kim"\n    }\n    return value\nnext = 1\n',
      [
        [1, 5],
        [2, 3],
      ],
    ],
    [
      'main.rb',
      'class Greeter\n  def greet\n    puts "Hello"\n  end\nend\n',
      [
        [1, 4],
        [2, 3],
      ],
    ],
    ['main.rs', 'fn greet() {\n    let value = 42;\n    println!("{}", value);\n}\n', [[1, 3]]],
    ['config.json', '{\n  "name": "Kim"\n}\n', [[1, 2]]],
    ['icon.SVG', '<svg>\n  <path/>\n</svg>\n', [[1, 2]]],
    ['index.html', '<div>\n  <p>Hello</p>\n</div>\n', [[1, 2]]],
    ['main.css', '.item {\n  color: red;\n}\n', [[1, 2]]],
    ['main.scss', '.item {\n  color: red;\n}\n', [[1, 2]]],
    ['main.less', '.item {\n  color: red;\n}\n', [[1, 2]]],
    ['main.sass', '.item\n  color: red\n', [[1, 2]]],
    ['main.toml', 'items = [\n  1,\n  2,\n]\n', [[1, 3]]],
    ['main.yaml', 'settings:\n  theme: dark\n  size: 14\nnext: 1\n', [[1, 3]]],
    ['main.xml', '<root>\n  <item/>\n</root>\n', [[1, 2]]],
    ['main.vue', '<template>\n  <div>Hello</div>\n</template>\n', [[1, 2]]],
    ['main.svelte', '<div>\n  <p>Hello</p>\n</div>\n', [[1, 2]]],
    ['main.astro', '<div>\n  <p>Hello</p>\n</div>\n', [[1, 2]]],
    ['main.jsonc', '{\n  // comment\n  "name": "Kim"\n}\n', [[1, 3]]],
    ['main.json5', '{\n  name: "Kim",\n}\n', [[1, 2]]],
  ] as const)('should discover original line ranges in %s', (path, source, ranges) => {
    expect(rangesOf(path, source)).toEqual(ranges)
  })
  it('should preserve mixed-newline line numbers without folding delimiter text inside literals', () => {
    const source = 'const pattern = /[{}]/;\r\nconst text = "{";\rconst real = {\n  value: 1\r\n}\n'
    expect(rangesOf('main.ts', source)).toEqual([[3, 4]])
  })
  it('should exclude single-line blocks, ordinary text and fake Python headers in strings', () => {
    expect(rangesOf('main.ts', 'const value = {name: "Kim"}\n')).toEqual([])
    expect(rangesOf('notes.txt', 'Example {\n  hello\n}\n')).toEqual([])
    expect(rangesOf('main.py', 'value = """\ndef fake():\n    text\n"""\n')).toEqual([])
  })
})
