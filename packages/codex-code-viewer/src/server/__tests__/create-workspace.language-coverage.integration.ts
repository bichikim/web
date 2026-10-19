import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
import type {CodeLocation} from '../../shared/contracts'

const positions = (locations: readonly CodeLocation[]) =>
  locations.map(({path, line, column}) => JSON.stringify([path, line, column])).sort()

describe('createWorkspace supported language reference coverage', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const write = (path: string, source: string) => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), source)
  }
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'language-coverage-')))
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it.each(['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs'])(
    'should retain aliases and reexports outside the defining %s package',
    async (extension) => {
      write(
        'tsconfig.json',
        JSON.stringify({
          compilerOptions: {allowJs: true, module: 'nodenext', moduleResolution: 'nodenext'},
        }),
      )
      const core = 'export function greet() { return 1 }\n'
      write(`packages/core/api.${extension}`, core)
      write(
        `packages/bridge/index.${extension}`,
        `export {greet as hello} from '../core/api.${extension}'\n`,
      )
      const source = [
        `import {hello as welcome} from '../packages/bridge/index.${extension}'`,
        'welcome()',
        'function shadow(welcome) { welcome() }',
        '',
      ].join('\n')
      write(`apps/use.${extension}`, source)
      const result = await workspace.references(
        `packages/core/api.${extension}`,
        core.indexOf('greet'),
      )
      expect(result.ok && positions(result.value)).toEqual(
        positions([
          {column: 9, line: 1, path: `packages/bridge/index.${extension}`},
          {column: 18, line: 1, path: `packages/bridge/index.${extension}`},
          {column: 9, line: 1, path: `apps/use.${extension}`},
          {column: 18, line: 1, path: `apps/use.${extension}`},
          {column: 1, line: 2, path: `apps/use.${extension}`},
        ]),
      )
      expect(
        await workspace.definitions(`apps/use.${extension}`, source.indexOf('welcome()')),
      ).toMatchObject({
        ok: true,
        value: [{column: 17, line: 1, path: `packages/core/api.${extension}`}],
      })
    },
  )
  it.each([
    ['annotated', 'hello: object = greet\nhello()\n'],
    ['chain', 'hello = welcome = greet\nhello()\nwelcome()\n'],
    ['semicolon', 'hello = greet; hello()\n'],
    ['multiline', 'hello = (\n    greet\n)\nhello()\n'],
  ])('should retain Python %s assignment aliases', async (_name, source) => {
    write('core.py', 'def greet(): pass\n')
    write('apps/use.py', `from core import greet\n${source}`)
    const result = await workspace.references('core.py', 4)
    const lines = source.split('\n')
    const expected = [...lines.entries()].flatMap(([index, text]) =>
      [...text.matchAll(/\b(?:hello|welcome)\(\)/gu)].map((match) => ({
        column: match.index + 1,
        line: index + 2,
        path: 'apps/use.py',
      })),
    )
    expect(result.ok && result.value).toEqual(expect.arrayContaining(expected))
  })
  it('should distinguish Python aliases before and after reassignment', async () => {
    write('core.py', 'def greet(): pass\ndef other(): pass\n')
    write(
      'apps/use.py',
      'from core import greet, other\nhello = greet\nhello()\ncopy = hello\nhello = other\nhello()\ncopy()\n',
    )
    const result = await workspace.references('core.py', 4)
    expect(
      result.ok &&
        result.value
          .filter(({line}) => [3, 6, 7].includes(line))
          .map(({line}) => line)
          .sort(),
    ).toEqual([3, 7])
    const document = workspace.read('core.py')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const batches = await Array.fromAsync(
      workspace.scanNavigation(
        {
          navigation: 'definition',
          offset: 4,
          path: 'core.py',
          revision: document.value.revision,
        },
        new AbortController().signal,
      ),
    )
    expect(new Set(positions(batches.flatMap((batch) => batch.locations)))).toEqual(
      new Set(result.ok ? positions(result.value) : []),
    )
  })
  it('should retain Rust glob reexports and raw aliases across packages', async () => {
    write('core/Cargo.toml', '[package]\nname="core-lib"\nedition="2021"\n')
    write('core/src/lib.rs', 'pub fn greet() {}\n')
    write(
      'bridge/Cargo.toml',
      '[package]\nname="bridge-lib"\nedition="2021"\n[dependencies]\napi={package="core-lib",path="../core"}\n',
    )
    write('bridge/src/lib.rs', 'pub use api::*;\npub use api::greet as r#type;\n')
    write(
      'app/Cargo.toml',
      '[package]\nname="app"\nedition="2021"\n[dependencies]\nbridge={package="bridge-lib",path="../bridge"}\n',
    )
    const source = 'use bridge::r#type as welcome;\nfn main() { welcome(); bridge::greet(); }\n'
    write('app/src/main.rs', source)
    write('other/Cargo.toml', '[package]\nname="other"\nedition="2021"\n')
    write('other/src/lib.rs', 'pub fn greet() {}\n')
    const result = await workspace.references('core/src/lib.rs', 7)
    expect(result.ok && positions(result.value)).toEqual(
      positions([
        {column: 14, line: 2, path: 'bridge/src/lib.rs'},
        {column: 23, line: 2, path: 'bridge/src/lib.rs'},
        {column: 13, line: 1, path: 'app/src/main.rs'},
        {column: 23, line: 1, path: 'app/src/main.rs'},
        {column: 13, line: 2, path: 'app/src/main.rs'},
        {column: 32, line: 2, path: 'app/src/main.rs'},
      ]),
    )
    expect(await workspace.definitions('app/src/main.rs', source.indexOf('welcome();'))).toEqual({
      ok: true,
      value: [{column: 8, line: 1, path: 'core/src/lib.rs'}],
    })
  })
  it('should include Ruby assignment expressions through branches', async () => {
    write('Gemfile', 'gem "solargraph"\n')
    write('lib/core.rb', 'class Original; end\nclass Other; end\n')
    write(
      'apps/use.rb',
      "require_relative '../lib/core'\nAlias = if ENV['FEATURE']\n  Original\nelse\n  Other\nend\nAlias.new\n",
    )
    const result = await workspace.references('lib/core.rb', 6)
    expect(result.ok && result.value).toEqual(
      expect.arrayContaining([{column: 1, line: 7, path: 'apps/use.rb'}]),
    )
  }, 30000)
  it.each([
    ['tuple', 'hello, welcome = greet, other\nhello()\nwelcome()\n'],
    [
      'branches',
      'hello = greet\nif flag:\n    hello = other\n    hello()\nelse:\n    hello()\nhello()\n',
    ],
    ['nested', 'def run():\n    hello = greet\n    hello()\n    hello = other\n    hello()\n'],
  ])('should keep Python %s alias scopes separate', async (name, source) => {
    write('core.py', 'def greet(): pass\ndef other(): pass\n')
    write('apps/use.py', `from core import greet, other\n${source}`)
    const result = await workspace.references('core.py', 4)
    const expected = name === 'tuple' ? [3] : name === 'branches' ? [7, 8] : [4]
    const calls = source
      .split('\n')
      .flatMap((text, index) => (/(?:hello|welcome)\(\)/u.test(text) ? [index + 2] : []))
    expect(
      result.ok &&
        result.value
          .filter(({line}) => calls.includes(line))
          .map(({line}) => line)
          .sort(),
    ).toEqual(expected)
  })
  it.each([
    ['tests/check.rs', ''],
    ['examples/demo.rs', ''],
    ['benches/check.rs', ''],
    ['custom/check.rs', '[[test]]\nname="custom-check"\npath="custom/check.rs"\n'],
  ])('should include Rust development dependency usages in %s', async (target, configuration) => {
    write('core/Cargo.toml', '[package]\nname="core-lib"\nedition="2021"\n')
    write('core/src/lib.rs', 'pub fn greet() {}\n')
    write(
      'app/Cargo.toml',
      [
        '[package]',
        'name="app"',
        'edition="2021"',
        configuration,
        '[dev-dependencies]',
        'api={package="core-lib",path="../core"}',
        '',
      ].join('\n'),
    )
    write('app/src/lib.rs', 'pub fn unrelated() {}\n')
    const source = 'use api::greet as hello;\nfn main() { hello(); }\n'
    write(`app/${target}`, source)
    expect(await workspace.definitions(`app/${target}`, source.lastIndexOf('hello'))).toEqual({
      ok: true,
      value: [{column: 8, line: 1, path: 'core/src/lib.rs'}],
    })
    const result = await workspace.references('core/src/lib.rs', 7)
    expect(result.ok && positions(result.value)).toEqual(
      positions([
        {column: 10, line: 1, path: `app/${target}`},
        {column: 19, line: 1, path: `app/${target}`},
        {column: 13, line: 2, path: `app/${target}`},
      ]),
    )
  })
  it.each(['while false', 'until true'])(
    'should retain Ruby aliases after %s',
    async (condition) => {
      write('Gemfile', 'gem "solargraph"\n')
      const core = 'class Original; end\nclass Other; end\n'
      write('lib/core.rb', core)
      write(
        'apps/use.rb',
        `require_relative '../lib/core'\nAlias = Original\n${condition}\n  Alias = Other\nend\nAlias.new\n`,
      )
      const result = await workspace.references('lib/core.rb', 6)
      expect(result.ok && result.value).toEqual(
        expect.arrayContaining([{column: 1, line: 6, path: 'apps/use.rb'}]),
      )
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      expect(
        other.ok && other.value.some(({path, line}) => path === 'apps/use.rb' && line === 6),
      ).toBe(false)
    },
    30000,
  )
  it.each(['cjs', 'mjs'])('should retain JavaScript %s import bindings', async (extension) => {
    const core =
      extension === 'cjs'
        ? 'function greet() {}\nmodule.exports = {greet}\n'
        : 'export function greet() {}\n'
    write(`packages/core/api.${extension}`, core)
    const source =
      extension === 'cjs'
        ? "const {greet: hello} = require('../packages/core/api.cjs');\nhello();\n"
        : "const {greet: hello} = await import('../packages/core/api.mjs');\nhello();\n"
    write(`apps/use.${extension}`, `${source}function shadow(hello) { hello() }\n`)
    write(`packages/other/api.${extension}`, core)
    write(
      `apps/other.${extension}`,
      extension === 'cjs'
        ? "const {greet: hello} = require('../packages/other/api.cjs');\nhello();\n"
        : "const {greet: hello} = await import('../packages/other/api.mjs');\nhello();\n",
    )
    const result = await workspace.references(
      `packages/core/api.${extension}`,
      core.indexOf('greet'),
    )
    expect(result.ok && result.value).toEqual(
      expect.arrayContaining([{column: 1, line: 2, path: `apps/use.${extension}`}]),
    )
    expect(
      result.ok &&
        result.value.some(
          ({path, line}) =>
            path === `apps/other.${extension}` || (path === `apps/use.${extension}` && line === 3),
        ),
    ).toBe(false)
    const document = workspace.read(`packages/core/api.${extension}`)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const batches = await Array.fromAsync(
      workspace.scanNavigation(
        {
          navigation: 'definition',
          offset: core.indexOf('greet'),
          path: `packages/core/api.${extension}`,
          revision: document.value.revision,
        },
        new AbortController().signal,
      ),
    )
    expect(new Set(positions(batches.flatMap((batch) => batch.locations)))).toEqual(
      new Set(result.ok ? positions(result.value) : []),
    )
  })
  it('should not expose Rust development dependencies to production library targets', async () => {
    write('core/Cargo.toml', '[package]\nname="core-lib"\nedition="2021"\n')
    write('core/src/lib.rs', 'pub fn greet() {}\n')
    write(
      'app/Cargo.toml',
      '[package]\nname="app"\nedition="2021"\n[dev-dependencies]\napi={package="core-lib",path="../core"}\n',
    )
    const source = 'pub fn unrelated() { api::greet(); }\n'
    write('app/src/lib.rs', source)
    write('app/tests/check.rs', 'fn test() { api::greet(); }\n')
    expect(await workspace.definitions('app/src/lib.rs', source.indexOf('greet'))).toEqual({
      ok: true,
      value: [],
    })
    const result = await workspace.references('core/src/lib.rs', 7)
    expect(result.ok && result.value.some(({path}) => path === 'app/src/lib.rs')).toBe(false)
    expect(result.ok && result.value.some(({path}) => path === 'app/tests/check.rs')).toBe(true)
  })
})
