import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

describe('createWorkspace aliases across project boundaries', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const write = (path: string, source: string) => {
    mkdirSync(dirname(join(root, path)), {recursive: true})
    writeFileSync(join(root, path), source)
  }
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-aliases-')))
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should join Python source and stub references through semantic definitions without another method', async () => {
    write('core.py', 'def greet():\n    return 1\nclass Other:\n    def greet(self): pass\n')
    write('core.pyi', 'def greet() -> int: ...\nclass Other:\n    def greet(self) -> None: ...\n')
    write('apps/use.py', 'from core import greet as hello\nhello()\n')
    write('apps/other.py', 'from core import Other\nOther().greet()\n')
    const expected = {
      ok: true,
      value: [
        {column: 18, line: 1, path: 'apps/use.py'},
        {column: 27, line: 1, path: 'apps/use.py'},
        {column: 1, line: 2, path: 'apps/use.py'},
      ],
    }
    const result = await workspace.references('core.py', 4)
    expect(
      result.ok && result.value.toSorted((a, b) => a.line - b.line || a.column - b.column),
    ).toEqual(expected.value)
    expect(await workspace.references('core.py', 4)).toEqual(result)
    const draft = '# draft\ndef greet():\n    return 2\n'
    const edited = await workspace.references('core.py', draft.indexOf('greet'), [
      {path: 'core.py', source: draft},
    ])
    expect(
      edited.ok && edited.value.toSorted((a, b) => a.line - b.line || a.column - b.column),
    ).toEqual(expected.value)
    expect(await workspace.references('core.py', 4)).toEqual(result)
  })
  it.each([
    ['pyrightconfig.json', JSON.stringify({extraPaths: ['../../packages/core/src']})],
    ['pyproject.toml', '[tool.pyright]\nextraPaths = ["../../packages/core/src"]\n'],
  ])(
    'should honor nested Python %s for aliases outside the defining package',
    async (name, configuration) => {
      write('packages/core/src/api.py', 'def greet():\n    return 1\n')
      write(`apps/consumer/${name}`, configuration)
      if (name === 'pyproject.toml') {
        write('packages/core/src/api.pyi', 'def greet() -> int: ...\n')
      }
      const source = 'from api import greet as hello\nhello()\n'
      write('apps/consumer/use.py', source)
      write('apps/other/api.py', 'def greet(): pass\n')
      write('apps/other/pyrightconfig.json', '{}')
      write('apps/other/use.py', source)
      expect(
        await workspace.definitions('apps/consumer/use.py', source.lastIndexOf('hello')),
      ).toEqual({
        ok: true,
        value: [
          ...(name === 'pyproject.toml'
            ? [{column: 5, line: 1, path: 'packages/core/src/api.pyi'}]
            : []),
          {column: 5, line: 1, path: 'packages/core/src/api.py'},
        ],
      })
      const result = await workspace.references('packages/core/src/api.py', 4)
      const document = workspace.read('packages/core/src/api.py')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const streamed = (
        await Array.fromAsync(
          workspace.scanNavigation(
            {
              navigation: 'definition',
              offset: 4,
              path: 'packages/core/src/api.py',
              revision: document.value.revision,
            },
            new AbortController().signal,
          ),
        )
      ).flatMap((batch) => batch.locations)
      expect(
        new Set(
          streamed.map((location) =>
            JSON.stringify([location.path, location.line, location.column]),
          ),
        ),
      ).toEqual(
        new Set(
          result.ok
            ? result.value.map((location) =>
                JSON.stringify([location.path, location.line, location.column]),
              )
            : [],
        ),
      )
      expect(
        result.ok && result.value.toSorted((a, b) => a.line - b.line || a.column - b.column),
      ).toEqual([
        {column: 17, line: 1, path: 'apps/consumer/use.py'},
        {column: 26, line: 1, path: 'apps/consumer/use.py'},
        {column: 1, line: 2, path: 'apps/consumer/use.py'},
      ])
    },
  )
  it('should follow Python reexports across a configured consumer and the defining package', async () => {
    write('packages/core/src/api.py', 'def greet(): return 1\n')
    write('packages/core/src/bridge.py', 'from api import greet as exported\n')
    write(
      'apps/consumer/pyrightconfig.json',
      JSON.stringify({extraPaths: ['../../packages/core/src']}),
    )
    write('apps/consumer/use.py', 'from bridge import exported as hello\nhello()\n')
    const result = await workspace.references('packages/core/src/api.py', 4)
    expect(
      result.ok &&
        result.value.toSorted(
          (a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column,
        ),
    ).toEqual([
      {column: 20, line: 1, path: 'apps/consumer/use.py'},
      {column: 32, line: 1, path: 'apps/consumer/use.py'},
      {column: 1, line: 2, path: 'apps/consumer/use.py'},
      {column: 17, line: 1, path: 'packages/core/src/bridge.py'},
      {column: 26, line: 1, path: 'packages/core/src/bridge.py'},
    ])
  })
  it('should find Rust renamed dependencies and aliases from independent Cargo projects', async () => {
    write('core/Cargo.toml', '[package]\nname="core-lib"\nedition="2021"\n')
    write('core/src/lib.rs', 'pub fn greet() {}')
    write(
      'app/Cargo.toml',
      '[package]\nname="app"\nedition="2021"\n[dependencies]\napi={package="core-lib",path="../core"}\n',
    )
    const source = 'use api::greet as hello;\nfn main() { hello(); }'
    write('app/src/main.rs', source)
    write('other/Cargo.toml', '[package]\nname="other"\nedition="2021"\n')
    write('other/src/main.rs', 'fn greet() {}\nfn main() { greet(); }')
    expect(await workspace.references('core/src/lib.rs', 7)).toEqual({
      ok: true,
      value: [
        {column: 10, line: 1, path: 'app/src/main.rs'},
        {column: 19, line: 1, path: 'app/src/main.rs'},
        {column: 13, line: 2, path: 'app/src/main.rs'},
      ],
    })
    expect(await workspace.definitions('app/src/main.rs', source.lastIndexOf('hello'))).toEqual({
      ok: true,
      value: [{column: 8, line: 1, path: 'core/src/lib.rs'}],
    })
  })
  it('should follow Ruby constant alias chains without another namespace or instance assignment', async () => {
    write('Gemfile', 'source "https://rubygems.org"\ngem "solargraph"\n')
    write('lib/core.rb', 'class Original\nend\n')
    write(
      'apps/use.rb',
      "require_relative '../lib/core'\nAlias = Original\nForward = Alias\nForward.new\n",
    )
    write(
      'apps/other.rb',
      'module Other\n  class Original; end\n  Alias = Original\n  Alias.new\nend\nInstance = Original.new\nInstance\n',
    )
    const result = await workspace.references('lib/core.rb', 6)
    expect(
      result.ok &&
        result.value.some((x) => x.path === 'apps/use.rb' && x.line === 4 && x.column === 1),
    ).toBe(true)
    expect(
      result.ok && result.value.some((x) => x.path === 'apps/other.rb' && [4, 7].includes(x.line)),
    ).toBe(false)
  }, 30000)
  it('should exclude Ruby constants reassigned to another class and terminate unrelated cycles', async () => {
    write('Gemfile', 'gem "solargraph"\n')
    write('lib/core.rb', 'class Original; end\nclass Other; end\n')
    write(
      'apps/use.rb',
      "require_relative '../lib/core'\nAlias = Original\nAlias = Other\nAlias.new\nCycleA = CycleB\nCycleB = CycleA\n",
    )
    const result = await workspace.references('lib/core.rb', 6)
    expect(result.ok).toBe(true)
    expect(result.ok && result.value.some((x) => x.path === 'apps/use.rb' && x.line === 4)).toBe(
      false,
    )
  }, 30000)
})
