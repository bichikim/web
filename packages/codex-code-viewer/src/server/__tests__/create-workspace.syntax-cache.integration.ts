import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
const fixtures = [
  {
    call: 'from helper import greet as welcome\nwelcome()\n',
    caller: 'caller.py',
    files: {'caller.py': 'from helper import greet\ngreet()\n', 'helper.py': 'def greet(): pass\n'},
    helper: 'helper.py',
    language: 'python',
    later: 'later.py',
    unused: 'from helper import greet\nvalue = 1\n',
  },
  {
    call: 'pub fn call() {\ncrate::helper::greet();\n}\n',
    caller: 'src/caller.rs',
    files: {
      'Cargo.toml': '[package]\nname="cache_test"\nversion="0.1.0"\nedition="2021"\n',
      'src/caller.rs': 'pub fn call() {\ncrate::helper::greet();\n}\n',
      'src/helper.rs': 'pub fn greet() {}\n',
      'src/lib.rs': 'pub mod helper; pub mod caller;\n',
    },
    helper: 'src/helper.rs',
    language: 'rust',
    later: 'src/later.rs',
    unused: 'pub fn call() {}\n',
  },
  {
    call: "require_relative 'helper'\nHelpers.greet()\n",
    caller: 'caller.rb',
    files: {
      'caller.rb': "require_relative 'helper'\nHelpers.greet()\n",
      Gemfile: "source 'https://rubygems.org'\n",
      'helper.rb': 'module Helpers\n  def self.greet; end\nend\n',
    },
    helper: 'helper.rb',
    language: 'ruby',
    later: 'later.rb',
    unused: "require_relative 'helper'\nvalue = 1\n",
  },
]
describe('createWorkspace syntax cache', () => {
  it.each(fixtures)(
    'should preserve closed-file changes and membership after cached $language queries',
    async (fixture) => {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'syntax-cache-')))
      const write = (path: string, source: string): void => {
        mkdirSync(join(root, path, '..'), {recursive: true})
        writeFileSync(join(root, path), source)
      }
      Object.entries(fixture.files).forEach(([path, source]) => {
        if (source !== undefined) {
          write(path, source)
        }
      })
      const workspace = createWorkspace(root)
      try {
        const document = workspace.read(fixture.helper)
        if (!document.ok) {
          throw new Error(document.error.code)
        }
        const input = {
          navigation: 'definition' as const,
          offset: document.value.source.indexOf('greet'),
          path: fixture.helper,
          revision: document.value.revision,
        }
        const query = async () =>
          (await Array.fromAsync(workspace.scanNavigation(input, new AbortController().signal)))
            .flatMap((batch) => batch.locations)
            .filter(
              (location) =>
                location.line === 2 && [fixture.caller, fixture.later].includes(location.path),
            )
            .map((location) => location.path)
            .sort()
        expect(await query()).toEqual([fixture.caller])
        expect(await query()).toEqual([fixture.caller])
        write(fixture.later, fixture.call)
        if (fixture.language === 'rust') {
          write('src/lib.rs', 'pub mod helper; pub mod caller; pub mod later;\n')
        }
        expect(await query()).toEqual([fixture.caller, fixture.later].sort())
        write(fixture.caller, fixture.unused)
        expect(await query()).toEqual([fixture.later])
        rmSync(join(root, fixture.later))
        if (fixture.language === 'rust') {
          write('src/lib.rs', 'pub mod helper; pub mod caller;\n')
        }
        expect(await query()).toEqual([])
      } finally {
        workspace.dispose()
        rmSync(root, {force: true, recursive: true})
      }
    },
  )
})
