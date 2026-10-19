import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

const fixtures = [
  {
    helper: 'def greet():\n    return 1\n',
    main: 'from helper import greet\ngreet()\n',
    path: 'helper.py',
    usage: 'main.py',
  },
  {
    helper: 'module Helper\n  def self.greet\n    1\n  end\nend\n',
    main: "require_relative 'helper'\nHelper.greet\n",
    path: 'helper.rb',
    usage: 'main.rb',
  },
  {
    helper: 'pub fn greet() {}\n',
    main: 'mod helper;\nfn main() { helper::greet(); }\n',
    path: 'helper.rs',
    usage: 'main.rs',
  },
]

describe('createWorkspace cached language navigation', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  afterEach(() => {
    workspace?.dispose()
    if (root !== undefined) {
      rmSync(root, {force: true, recursive: true})
    }
  })
  it.each(fixtures)(
    'should refresh cached usages after a closed $usage changes',
    async (entry) => {
      root = realpathSync(mkdtempSync(join(tmpdir(), 'language-cache-')))
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, entry.path), entry.helper)
      writeFileSync(join(root, entry.usage), entry.main)
      workspace = createWorkspace(root)
      const document = workspace.read(entry.path)
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      const query = async () =>
        (
          await Array.fromAsync(
            workspace.scanNavigation(
              {
                navigation: 'definition',
                offset: entry.helper.indexOf('greet') + 2,
                path: entry.path,
                revision: document.value.revision,
              },
              new AbortController().signal,
            ),
          )
        ).flatMap((batch) => batch.locations)
      const before = await query()
      expect(before.some((location) => location.path === entry.path)).toBe(false)
      expect(before).toEqual(
        expect.arrayContaining([expect.objectContaining({line: 2, path: entry.usage})]),
      )
      expect(await query()).toEqual(before)
      writeFileSync(join(root, entry.usage), `\n\n${entry.main}`)
      const after = await query()
      expect(after).toEqual(
        expect.arrayContaining([expect.objectContaining({line: 4, path: entry.usage})]),
      )
      expect(after.some((location) => location.path === entry.usage && location.line === 2)).toBe(
        false,
      )
      expect(
        await workspace.references(entry.path, entry.helper.indexOf('greet') + 2),
      ).toMatchObject({
        ok: true,
        value: expect.arrayContaining([expect.objectContaining({line: 4, path: entry.usage})]),
      })
      rmSync(join(root, entry.usage))
      expect((await query()).some((location) => location.path === entry.usage)).toBe(false)
      writeFileSync(join(root, entry.usage), entry.main)
      expect(await query()).toEqual(
        expect.arrayContaining([expect.objectContaining({line: 2, path: entry.usage})]),
      )
      const later = entry.usage.replace('main.', 'later.')
      const rust = entry.usage === 'main.rs'
      const main = rust ? entry.main.replace('mod helper;', 'mod helper; mod later;') : entry.main
      writeFileSync(
        join(root, later),
        rust ? 'pub fn visit() { crate::helper::greet(); }' : entry.main,
      )
      if (rust) {
        writeFileSync(join(root, entry.usage), main)
      }
      expect(await query()).toEqual(
        expect.arrayContaining([expect.objectContaining({path: later})]),
      )
      writeFileSync(join(root, entry.path), `\n\n${entry.helper}`)
      expect(await workspace.definitions(entry.usage, main.lastIndexOf('greet') + 2)).toMatchObject(
        {
          ok: true,
          value: [
            expect.objectContaining({
              line: entry.helper.slice(0, entry.helper.indexOf('greet')).split('\n').length + 2,
              path: entry.path,
            }),
          ],
        },
      )
    },
    30000,
  )
  it.each(fixtures)(
    'should discard the previous $path draft before navigating saved sources',
    async (entry) => {
      root = realpathSync(mkdtempSync(join(tmpdir(), 'language-draft-')))
      mkdirSync(join(root, '.git'))
      writeFileSync(join(root, entry.path), entry.helper)
      writeFileSync(join(root, entry.usage), entry.main)
      workspace = createWorkspace(root)
      const draft = `\n\n${entry.helper}`
      const line = entry.helper.slice(0, entry.helper.indexOf('greet')).split('\n').length
      expect(
        await workspace.definitions(entry.path, draft.indexOf('greet') + 2, [
          {path: entry.path, source: draft},
        ]),
      ).toMatchObject({
        ok: true,
        value: [expect.objectContaining({line: line + 2, path: entry.path})],
      })
      expect(
        await workspace.definitions(entry.usage, entry.main.lastIndexOf('greet') + 2),
      ).toMatchObject({
        ok: true,
        value: [expect.objectContaining({line, path: entry.path})],
      })
    },
    30000,
  )
})
