import {execFileSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
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
  'createWorkspace Ruby branches with %s Solargraph',
  (mode) => {
    let root: string
    let workspace: ReturnType<typeof createWorkspace>
    const write = (path: string, source: string) => {
      mkdirSync(dirname(join(root, path)), {recursive: true})
      writeFileSync(join(root, path), source)
    }
    beforeEach(() => {
      root = realpathSync(mkdtempSync(join(tmpdir(), 'ruby-branches-')))
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
    it('should join unknown branches and keep usages inside each branch separate', async () => {
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          "if ENV['FEATURE']",
          '  Alias = Original',
          '  Alias.new',
          'else',
          '  Alias = Other',
          '  Alias.new',
          'end',
          'Copy = Alias',
          'Copy.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(original).toMatchObject({ok: true})
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      expect(original.ok && positions(original.value)).toEqual(
        positions([
          {column: 3, line: 3, path: 'apps/use.rb'},
          {column: 11, line: 3, path: 'apps/use.rb'},
          {column: 3, line: 4, path: 'apps/use.rb'},
          {column: 1, line: 9, path: 'apps/use.rb'},
          {column: 8, line: 9, path: 'apps/use.rb'},
          {column: 1, line: 10, path: 'apps/use.rb'},
        ]),
      )
      expect(other.ok && positions(other.value)).toEqual(
        positions([
          {column: 3, line: 6, path: 'apps/use.rb'},
          {column: 11, line: 6, path: 'apps/use.rb'},
          {column: 3, line: 7, path: 'apps/use.rb'},
          {column: 1, line: 9, path: 'apps/use.rb'},
          {column: 8, line: 9, path: 'apps/use.rb'},
          {column: 1, line: 10, path: 'apps/use.rb'},
        ]),
      )
    }, 30000)

    it('should preserve the incoming alias through false branches, unless and a static case', async () => {
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          'Alias = Original',
          'if false',
          '  Alias = Other',
          'elsif true',
          '  Copy = Alias',
          'end',
          'Alias.new',
          'unless true',
          '  Alias = Other',
          'end',
          'Alias.new',
          "case 'original'",
          "when 'other'",
          '  Alias = Other',
          "when 'missing', 'original'",
          '  Alias = Copy',
          'end',
          'Alias.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(original).toMatchObject({ok: true})
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      const calls = (result: typeof original) =>
        result.ok &&
        result.value
          .filter(({line}) => [8, 12, 19].includes(line))
          .map(({line}) => line)
          .sort((a, b) => a - b)
      expect(calls(original)).toEqual([8, 12, 19])
      expect(calls(other)).toEqual([])
    }, 30000)

    it('should resolve computed require paths across package boundaries', async () => {
      write(
        'packages/models/lib/bridge.rb',
        "require_relative '../../../lib/core'\nAlias = Original\n",
      )
      write(
        'apps/file_join.rb',
        "require File.join(__dir__, '..', 'packages', 'models', 'lib', 'bridge')\nAlias.new\n",
      )
      write(
        'apps/use.rb',
        [
          "folder = '../packages/models'",
          'segment = "lib" + "/bridge"',
          'require_relative "#{folder}/#{segment}"',
          'Alias.new',
          'Copy = Alias',
          "require File.join(__dir__, '..', 'packages', 'models', 'lib', 'bridge')",
          'Copy.new',
          '',
        ].join('\n'),
      )
      const result = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(result.ok && positions(result.value)).toEqual(
        positions([
          {column: 1, line: 2, path: 'apps/file_join.rb'},
          {column: 1, line: 2, path: 'packages/models/lib/bridge.rb'},
          {column: 9, line: 2, path: 'packages/models/lib/bridge.rb'},
          {column: 1, line: 4, path: 'apps/use.rb'},
          {column: 1, line: 5, path: 'apps/use.rb'},
          {column: 8, line: 5, path: 'apps/use.rb'},
          {column: 1, line: 7, path: 'apps/use.rb'},
        ]),
      )
    }, 30000)

    it('should join branch-dependent require targets and ignore unresolved or deferred loads', async () => {
      write('lib/first.rb', "require_relative 'core'\nAlias = Original\n")
      write('lib/second.rb', "require_relative 'core'\nAlias = Other\n")
      write(
        'apps/use.rb',
        [
          "path = ENV['FEATURE'] ? '../lib/first' : '../lib/second'",
          'require_relative path',
          'Copy = Alias',
          'Copy.new',
          'require_relative arbitrary_project_function',
          'def load_later',
          "  require_relative '../lib/second'",
          'end',
          'Copy.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(original).toMatchObject({ok: true})
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      const calls = (result: typeof original) =>
        result.ok && positions(result.value.filter(({path}) => path === 'apps/use.rb'))
      const expected = positions([
        {column: 1, line: 3, path: 'apps/use.rb'},
        {column: 8, line: 3, path: 'apps/use.rb'},
        {column: 1, line: 4, path: 'apps/use.rb'},
        {column: 1, line: 9, path: 'apps/use.rb'},
      ])
      expect(calls(original)).toEqual(expected)
      expect(calls(other)).toEqual(expected)
    }, 30000)

    it('should resolve method receivers separately inside branches and merge after the join', async () => {
      const models =
        'class Original\n  def greet; 1; end\nend\nclass Other\n  def greet; 2; end\nend\n'
      write('lib/core.rb', models)
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          "if ENV['FEATURE']",
          '  Alias = Original',
          '  Alias.new.greet',
          'else',
          '  Alias = Other',
          '  Alias.new.greet',
          'end',
          'Alias.new.greet',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', models.indexOf('greet'))
      expect(original).toMatchObject({ok: true})
      const other = await workspace.references('lib/core.rb', models.lastIndexOf('greet'))
      expect(original.ok && positions(original.value)).toEqual(
        positions([
          {column: 13, line: 4, path: 'apps/use.rb'},
          {column: 11, line: 9, path: 'apps/use.rb'},
        ]),
      )
      expect(other.ok && positions(other.value)).toEqual(
        positions([
          {column: 13, line: 7, path: 'apps/use.rb'},
          {column: 11, line: 9, path: 'apps/use.rb'},
        ]),
      )
    }, 30000)
    it('should retain the incoming branch without else and preserve require-once state after a join', async () => {
      write('lib/first.rb', "require_relative 'core'\nAlias = Original\n")
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          'Alias = Original',
          "if ENV['FEATURE']",
          "  require_relative '../lib/first'",
          '  Alias = Other',
          'end',
          'Alias.new',
          "require_relative '../lib/first'",
          'Copy = Alias',
          'Copy.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      const calls = (result: typeof original) =>
        result.ok &&
        result.value
          .filter(({path, line}) => path === 'apps/use.rb' && [7, 10].includes(line))
          .map(({line}) => line)
          .sort((a, b) => a - b)
      expect(calls(original)).toEqual([7, 10])
      expect(calls(other)).toEqual([7, 10])
    }, 30000)

    it('should keep constant string paths, short circuits and namespace scopes separate', async () => {
      write('lib/first.rb', "require_relative 'core'\nAlias = Original\n")
      write('lib/second.rb', "require_relative 'core'\nAlias = Other\n")
      write(
        'apps/use.rb',
        [
          "PATH = (nil || '../lib/first').freeze",
          'require_relative PATH',
          "false && require_relative('../lib/second')",
          'Alias.new',
          "path = '../lib/second'",
          'module Shadow',
          '  require_relative path',
          '  class Original; end',
          '  Alias = Original',
          '  Alias.new',
          'end',
          'Alias.new',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', core.indexOf('Original'))
      const other = await workspace.references('lib/core.rb', core.indexOf('Other'))
      expect(
        original.ok &&
          original.value.filter(({path}) => path === 'apps/use.rb').map(({line}) => line),
      ).toEqual([4, 12])
      expect(other.ok && other.value.filter(({path}) => path === 'apps/use.rb')).toEqual([])
    }, 30000)

    it('should include aliases in an unselected branch without applying its assignments after the branch', async () => {
      write(
        'apps/use.rb',
        [
          "require_relative '../lib/core'",
          'if false',
          '  Hidden = Original',
          '  Hidden.new',
          'end',
          'Hidden.new',
          '',
        ].join('\n'),
      )
      const result = await workspace.references('lib/core.rb', core.indexOf('Original'))
      expect(result.ok && positions(result.value)).toEqual(
        positions([
          {column: 3, line: 3, path: 'apps/use.rb'},
          {column: 12, line: 3, path: 'apps/use.rb'},
          {column: 3, line: 4, path: 'apps/use.rb'},
        ]),
      )
    }, 30000)
    it('should retain symbol names, setters and Unicode references when pruning absent names', async () => {
      const models = [
        'class Original',
        '  def greet!; 1; end',
        '  def value=(next_value); @value = next_value; end',
        'end',
        'class Other; def value=(next_value); end; end',
        '',
      ].join('\n')
      write('lib/core.rb', models)
      write(
        'packages/models/lib/bridge.rb',
        "require_relative '../../../lib/core'\nÄlias = Original\n",
      )
      write(
        'apps/use.rb',
        [
          "require_relative '../packages/models/lib/bridge'",
          '# Original Älias greet! value=',
          'PrefixOriginal = Other',
          'Alias10 = Other',
          'Alias1 = Älias',
          'Alias1.new.greet!',
          'Alias1.new.value = 1',
          'Alias10.new',
          'PrefixOriginal.new',
          'Alias10.new.value = 2',
          '',
        ].join('\n'),
      )
      const original = await workspace.references('lib/core.rb', models.indexOf('Original'))
      const method = await workspace.references('lib/core.rb', models.indexOf('greet!'))
      const setter = await workspace.references('lib/core.rb', models.indexOf('value='))
      expect(original.ok && positions(original.value)).toEqual(
        positions([
          {column: 1, line: 2, path: 'packages/models/lib/bridge.rb'},
          {column: 9, line: 2, path: 'packages/models/lib/bridge.rb'},
          {column: 1, line: 5, path: 'apps/use.rb'},
          {column: 10, line: 5, path: 'apps/use.rb'},
          {column: 1, line: 6, path: 'apps/use.rb'},
          {column: 1, line: 7, path: 'apps/use.rb'},
        ]),
      )
      expect(method.ok && positions(method.value)).toEqual(
        positions([{column: 12, line: 6, path: 'apps/use.rb'}]),
      )
      expect(setter.ok && positions(setter.value)).toEqual(
        positions([{column: 12, line: 7, path: 'apps/use.rb'}]),
      )
    }, 30000)
  },
)
