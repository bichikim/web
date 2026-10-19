import {execFileSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createWorkspace} from '../create-workspace'
import type {CodeLocation} from '../../shared/contracts'

const positions = (locations: readonly CodeLocation[]) =>
  locations.map(({path, line, column}) => JSON.stringify([path, line, column])).sort()
const core = 'class Original\nend\nclass Other\nend\n'
const external = execFileSync(
  'ruby',
  ['-e', 'require "rubygems"; puts Gem.bin_path("solargraph", "solargraph")'],
  {encoding: 'utf8'},
).trim()

describe.each(['default', 'external'] as const)(
  'createWorkspace Ruby reassignment with %s Solargraph',
  (mode) => {
    let root: string
    let workspace: ReturnType<typeof createWorkspace>
    const write = (path: string, source: string) => {
      mkdirSync(dirname(join(root, path)), {recursive: true})
      writeFileSync(join(root, path), source)
    }
    beforeEach(() => {
      root = realpathSync(mkdtempSync(join(tmpdir(), 'ruby-flow-')))
      write('Gemfile', 'gem "solargraph"\n')
      write('lib/core.rb', core)
      const executable = join(root, 'external solargraph')
      copyFileSync(external, executable)
      chmodSync(executable, 0o755)
      vi.stubEnv('SOLARGRAPH_BINARY', mode === 'external' ? executable : '')
      if (mode === 'external') {
        const temporary = join(root, 'loader space')
        mkdirSync(temporary)
        vi.stubEnv('TMPDIR', temporary)
        vi.stubEnv('RUBYOPT', '-W0')
      }
      workspace = createWorkspace(root)
    })
    afterEach(() => {
      workspace.dispose()
      vi.unstubAllEnvs()
      rmSync(root, {force: true, recursive: true})
    })
    it('should distinguish calls before and after reassignment and preserve a copied alias', async () => {
      const source = [
        "require_relative '../lib/core'",
        'Alias = Original',
        'Alias.new',
        'Copy = Alias',
        'Alias = Other',
        'Alias.new',
        'Copy.new',
        'Alias = Original',
        'Alias.new',
        '',
      ].join('\n')
      write('apps/use.rb', source)
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      if (mode === 'external') {
        expect(readdirSync(join(root, 'loader space'))).toEqual([])
      }
      expect(original.ok && positions(original.value)).toEqual(
        positions([
          {column: 1, line: 2, path: 'apps/use.rb'},
          {column: 9, line: 2, path: 'apps/use.rb'},
          {column: 1, line: 3, path: 'apps/use.rb'},
          {column: 1, line: 4, path: 'apps/use.rb'},
          {column: 8, line: 4, path: 'apps/use.rb'},
          {column: 1, line: 7, path: 'apps/use.rb'},
          {column: 1, line: 8, path: 'apps/use.rb'},
          {column: 9, line: 8, path: 'apps/use.rb'},
          {column: 1, line: 9, path: 'apps/use.rb'},
        ]),
      )
      expect(other.ok && positions(other.value)).toEqual(
        positions([
          {column: 1, line: 5, path: 'apps/use.rb'},
          {column: 9, line: 5, path: 'apps/use.rb'},
          {column: 1, line: 6, path: 'apps/use.rb'},
        ]),
      )
      const document = workspace.read('lib/core.rb')
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const batches = await Array.fromAsync(
        workspace.scanNavigation(
          {
            navigation: 'definition',
            offset: core.indexOf('Original'),
            path: 'lib/core.rb',
            revision: document.value.revision,
          },
          new AbortController().signal,
        ),
      )
      expect(new Set(positions(batches.flatMap((batch) => batch.locations)))).toEqual(
        new Set(original.ok ? positions(original.value) : []),
      )
      write('apps/use.rb', source.replace('Alias = Other', 'Alias = Original'))
      const changed = await workspace.references('lib/core.rb', core.indexOf('Original'))
      const removed = await workspace.references('lib/core.rb', core.indexOf('Other'))
      expect(changed.ok && changed.value).toHaveLength(12)
      expect(removed).toEqual({ok: true, value: []})
    }, 30000)
    it('should retain a copied alias across files and exclude other namespaces and instances', async () => {
      write(
        'lib/bridge.rb',
        "require_relative 'core'\nAlias = Original\nCopy = Alias\nAlias = Other\n",
      )
      write('apps/use.rb', "require_relative '../lib/bridge'\nCopy.new\nAlias.new\n")
      write(
        'apps/shadow.rb',
        [
          'module Shadow',
          '  class Original; end',
          '  Alias = Original',
          '  Alias.new',
          'end',
          'Instance = Original.new',
          'Instance',
          '',
        ].join('\n'),
      )
      const result = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(result.ok && positions(result.value)).toEqual(
        positions([
          {column: 1, line: 2, path: 'lib/bridge.rb'},
          {column: 9, line: 2, path: 'lib/bridge.rb'},
          {column: 1, line: 3, path: 'lib/bridge.rb'},
          {column: 8, line: 3, path: 'lib/bridge.rb'},
          {column: 1, line: 2, path: 'apps/use.rb'},
          {column: 12, line: 6, path: 'apps/shadow.rb'},
        ]),
      )
    }, 30000)

    it('should follow separate require_relative assignment order', async () => {
      write('lib/first.rb', "require_relative 'core'\nAlias = Original\n")
      write('lib/second.rb', "require_relative 'core'\nAlias = Other\n")
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/first'",
          'Alias.new',
          'Copy = Alias',
          "require_relative '../lib/second'",
          'Alias.new',
          'Copy.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      expect(
        original.ok &&
          original.value
            .filter((location) => location.path === 'apps/use.rb')
            .map((location) => location.line)
            .sort(),
      ).toEqual([2, 3, 3, 6])
      expect(
        other.ok &&
          other.value
            .filter((location) => location.path === 'apps/use.rb')
            .map((location) => location.line),
      ).toEqual([5])
    }, 30000)

    it('should distinguish method usages through reassigned class aliases', async () => {
      const models =
        'class Original\n  def greet; 1; end\nend\nclass Other\n  def greet; 2; end\nend\n'
      write('lib/core.rb', models)
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          'Alias = Original',
          'Alias.new.greet',
          'Alias = Other',
          'Alias.new.greet',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', models.indexOf('greet'))
      const other = await workspace.references('lib/core.rb', models.lastIndexOf('greet'))
      expect(original.ok && positions(original.value)).toEqual(
        positions([{column: 11, line: 3, path: 'apps/use.rb'}]),
      )
      expect(other.ok && positions(other.value)).toEqual(
        positions([{column: 11, line: 5, path: 'apps/use.rb'}]),
      )
    }, 30000)
  },
)
