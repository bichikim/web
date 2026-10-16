import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
const count = 48
const fixtures = [
  {
    caller: "import {welcome as hello} from '../packages/bridge/index.js'\nhello()\n",
    callLine: 2,
    files: {
      'jsconfig.json':
        '{"compilerOptions":{"allowJs":true,"noLib":true,"types":[],"module":"esnext","moduleResolution":"bundler"}}',
      'packages/bridge/index.js': "export {greet as welcome} from '../core/api.js'\n",
      'packages/core/api.js': 'export function greet() {}\n',
    },
    helper: 'packages/core/api.js',
    language: 'javascript',
    path: (index: number) => `consumers/caller_${index}.js`,
  },
  {
    caller: "import {welcome as hello} from '../packages/bridge/index'\nhello()\n",
    callLine: 2,
    files: {
      'decoys/noise.ts': 'function greet() {}\nconst hello = greet; hello()\n',
      'packages/bridge/index.ts': "export {greet as welcome} from '../core/api'\n",
      'packages/core/api.ts': 'export function greet() {}\n',
      'tsconfig.json':
        '{"compilerOptions":{"noLib":true,"types":[],"module":"esnext","moduleResolution":"bundler"}}',
    },
    helper: 'packages/core/api.ts',
    language: 'typescript',
    path: (index: number) => `consumers/caller_${index}.ts`,
  },
  {
    caller: 'from packages.bridge.api import welcome as hello\nhello()\n',
    callLine: 2,
    files: {
      'decoys/noise.py': 'def greet():\n    pass\nhello = greet\nhello()\n',
      'packages/bridge/api.py': 'from packages.core.api import greet as welcome\n',
      'packages/core/api.py': 'def greet():\n    pass\n',
      'pyrightconfig.json': '{"include":["packages","consumers"]}',
    },
    helper: 'packages/core/api.py',
    language: 'python',
    path: (index: number) => `consumers/caller_${index}.py`,
  },
  {
    caller: 'use core_alias::welcome as hello;\npub fn call(){ hello(); }\n',
    callLine: 2,
    files: {
      'app/Cargo.toml':
        '[package]\nname="app_alias"\nversion="0.1.0"\nedition="2021"\n[dependencies]\ncore_alias={path="../core"}\n',
      'app/src/lib.rs': Array.from({length: count}, (_, index) => `pub mod caller_${index};`).join(
        '\n',
      ),
      'Cargo.toml': '[workspace]\nmembers=["core","app"]\nresolver="2"\n',
      'core/Cargo.toml': '[package]\nname="core_alias"\nversion="0.1.0"\nedition="2021"\n',
      'core/src/lib.rs': 'pub fn greet() {}\npub use greet as welcome;\npub mod noise;\n',
      'core/src/noise.rs': 'pub fn greet() {}\nuse greet as hello;\npub fn call(){hello();}\n',
    },
    helper: 'core/src/lib.rs',
    language: 'rust',
    path: (index: number) => `app/src/caller_${index}.rs`,
  },
  {
    caller: "require_relative '../packages/core/api'\nGreeting.new.hello\n",
    callLine: 2,
    files: {
      'decoys/noise.rb': 'class Noise\n def greet; end\n alias hello greet\nend\nNoise.new.hello\n',
      'packages/core/api.rb':
        'class Greeting\n  def greet; end\n  alias welcome greet\n  alias_method :hello, :welcome\nend\n',
      'packages/core/Gemfile': 'source "https://rubygems.org"\n',
    },
    helper: 'packages/core/api.rb',
    language: 'ruby',
    path: (index: number) => `consumers/caller_${index}.rb`,
  },
]
describe('createWorkspace streaming', () => {
  it.each(
    fixtures.flatMap((fixture) =>
      fixture.language === 'rust'
        ? [
            fixture,
            {
              ...fixture,
              caller: 'use core_alias::welcome as r#type;\npub fn call(){ r#type(); }\n',
              language: 'rust raw aliases',
            },
          ]
        : [fixture],
    ),
  )(
    'should publish partial $language usages and retain every alias caller outside its package',
    async (fixture) => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'streaming-navigation-')))
      const write = (path: string, source: string): void => {
        mkdirSync(join(root, path, '..'), {recursive: true})
        writeFileSync(join(root, path), source)
      }
      Object.entries(fixture.files).forEach(([path, source]) => {
        if (source !== undefined) {
          write(path, source)
        }
      })
      Array.from({length: count}, (_, index) => write(fixture.path(index), fixture.caller))
      const workspace = createWorkspace(root)
      try {
        const document = workspace.read(fixture.helper)
        if (!document.ok) {
          throw new Error('missing fixture')
        }
        const input = {
          navigation: 'definition' as const,
          offset: document.value.source.indexOf('greet'),
          path: fixture.helper,
          revision: document.value.revision,
        }
        const controller = new AbortController()
        const stream = workspace.scanNavigation(input, controller.signal)
        const first = await stream.next()
        expect(first.value?.kind).toBe('references')
        const partial = first.value?.locations.length
          ? first.value.locations
          : (await stream.next()).value?.locations
        expect(partial?.length).toBeGreaterThan(0)
        expect(partial?.length).toBeLessThan(count)
        controller.abort()
        await stream.return(undefined)
        const batches = await Array.fromAsync(
          workspace.scanNavigation(input, new AbortController().signal),
        )
        const found = batches.flatMap((batch) => batch.locations)
        expect(
          new Set(
            found.map((location) =>
              JSON.stringify([location.path, location.line, location.column]),
            ),
          ).size,
        ).toBe(found.length)
        expect(found.some((location) => location.path.includes('noise'))).toBe(false)
        const callers = found
          .filter(
            (location) => location.line === fixture.callLine && location.path.includes('caller_'),
          )
          .map((location) => location.path)
          .sort()
        expect(callers).toEqual(
          Array.from({length: count}, (_, index) => fixture.path(index)).sort(),
        )
        expect(
          await workspace.definitions(
            fixture.path(0),
            fixture.caller.lastIndexOf(fixture.caller.includes('r#') ? 'r#type' : 'hello'),
          ),
        ).toMatchObject({
          ok: true,
          value: expect.arrayContaining([expect.objectContaining({path: fixture.helper})]),
        })
      } finally {
        workspace.dispose()
        rmSync(root, {force: true, recursive: true})
      }
    },
    60000,
  )
})
