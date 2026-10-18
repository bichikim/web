import {cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
import {resolveNavigation} from '../resolve-navigation'

describe('createWorkspace Python navigation', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  let source: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'python-navigation-')))
    cpSync(new URL('./fixtures/python', import.meta.url), root, {recursive: true})
    source = readFileSync(join(root, 'main.py'), 'utf8')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should find usages of a Python definition with the bundled analyzer', async () => {
    const helper = readFileSync(join(root, 'helpers.py'), 'utf8')
    const document = workspace.read('helpers.py')
    expect(document.ok).toBe(true)
    if (document.ok) {
      expect(
        await resolveNavigation({
          document: document.value,
          navigation: 'definition',
          offset: helper.indexOf('greet') + 2,
          path: 'helpers.py',
          workspace,
        }),
      ).toMatchObject({
        ok: true,
        value: {
          kind: 'references',
          locations: expect.arrayContaining([expect.objectContaining({path: 'main.py'})]),
        },
      })
    }
    const draft = `# unsaved header\n${helper}`
    const edited = await workspace.references('helpers.py', draft.indexOf('greet'), [
      {path: 'helpers.py', source: draft},
    ])
    expect(edited).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({path: 'main.py'})]),
    })
    const references = await workspace.references('helpers.py', helper.indexOf('greet'))
    expect(references).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({path: 'main.py'})]),
    })
    if (references.ok) {
      expect(
        references.value.some((entry) => entry.path === 'helpers.py' && entry.line === 1),
      ).toBe(false)
    }
  })
  it('should include aliased calls and exclude unrelated aliases in unopened modules', async () => {
    writeFileSync(join(root, 'bridge.py'), 'from helpers import greet as exported\n')
    writeFileSync(
      join(root, 'caller.py'),
      'from bridge import exported as welcome\nwelcome("hello")\n',
    )
    writeFileSync(join(root, 'unrelated.py'), 'def greet(value): return value\n')
    writeFileSync(
      join(root, 'other.py'),
      'from unrelated import greet as welcome\nwelcome("other")\n',
    )
    const helper = readFileSync(join(root, 'helpers.py'), 'utf8')
    const references = await workspace.references('helpers.py', helper.indexOf('greet'))
    expect(references).toMatchObject({
      ok: true,
      value: expect.arrayContaining([
        expect.objectContaining({line: 8, path: 'main.py'}),
        expect.objectContaining({line: 11, path: 'main.py'}),
        expect.objectContaining({line: 2, path: 'caller.py'}),
      ]),
    })
    if (references.ok) {
      expect(references.value.some(({path}) => path === 'other.py')).toBe(false)
      expect(new Set(references.value.map((location) => JSON.stringify(location))).size).toBe(
        references.value.length,
      )
    }
  })
  it('should refresh cached aliased calls after a closed module changes', async () => {
    const document = workspace.read('helpers.py')
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const input = {
      navigation: 'definition' as const,
      offset: document.value.source.indexOf('greet'),
      path: 'helpers.py',
      revision: document.value.revision,
    }
    const query = async () =>
      (await Array.fromAsync(workspace.scanNavigation(input, new AbortController().signal)))
        .flatMap(({locations}) => locations)
        .toSorted(
          (left, right) =>
            left.path.localeCompare(right.path) ||
            left.line - right.line ||
            left.column - right.column,
        )
    expect(await query()).toEqual(
      expect.arrayContaining([expect.objectContaining({line: 8, path: 'main.py'})]),
    )
    writeFileSync(join(root, 'caller.py'), 'from helpers import greet as welcome\nwelcome("new")\n')
    const added = await query()
    expect(added).toEqual(
      expect.arrayContaining([expect.objectContaining({line: 2, path: 'caller.py'})]),
    )
    expect(await query()).toEqual(added)
    writeFileSync(join(root, 'other.py'), 'def greet(value): return value\n')
    writeFileSync(join(root, 'caller.py'), 'from other import greet as welcome\nwelcome("other")\n')
    expect((await query()).some(({path}) => path === 'caller.py')).toBe(false)
  })
  it('should retain bindings and calls for repeated and differently named aliases in unopened files', async () => {
    const expected = Array.from({length: 12}, (_, index) => {
      const path = `caller_${index}.py`
      const alias = index < 6 ? 'shared' : `unique_${index}`
      const text = `from helpers import greet as ${alias}\n${alias}("value")\n`
      writeFileSync(join(root, path), text)
      return {binding: 30, path}
    })
    const result = await workspace.references('helpers.py', 4)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    for (const {path, binding} of expected) {
      expect(result.value).toEqual(
        expect.arrayContaining([
          {column: 21, line: 1, path},
          {column: binding, line: 1, path},
          {column: 1, line: 2, path},
        ]),
      )
    }
  })
  it('should follow name assignments through imports and exclude shadowed names and returned values', async () => {
    writeFileSync(
      join(root, 'assignment.py'),
      'from helpers import greet\nwelcome = greet\nwelcome("direct")\n',
    )
    writeFileSync(
      join(root, 'chained.py'),
      'from assignment import welcome as hello\nhello("chain")\n',
    )
    writeFileSync(
      join(root, 'qualified.py'),
      'import helpers\nwelcome = helpers.greet\nwelcome("qualified")\n',
    )
    writeFileSync(
      join(root, 'shadowed.py'),
      'from helpers import greet\nwelcome = greet\ndef other(welcome):\n    welcome("shadowed")\nwelcome("actual")\n',
    )
    writeFileSync(
      join(root, 'returned.py'),
      'from helpers import greet\nwelcome = greet("value")\nwelcome("returned")\n',
    )
    const result = await workspace.references('helpers.py', 4)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({line: 3, path: 'assignment.py'}),
        expect.objectContaining({line: 2, path: 'chained.py'}),
        expect.objectContaining({line: 3, path: 'qualified.py'}),
        expect.objectContaining({line: 5, path: 'shadowed.py'}),
      ]),
    )
    expect(
      result.value.some((location) => location.path === 'shadowed.py' && location.line === 4),
    ).toBe(false)
    expect(
      result.value.some((location) => location.path === 'returned.py' && location.line === 3),
    ).toBe(false)
  })
  it('should follow aliased classes and wildcard reexports without matching another class', async () => {
    writeFileSync(join(root, 'bridge.py'), 'from reports.models import Report as Exported\n')
    writeFileSync(join(root, 'caller.py'), 'from bridge import *\nreport = Exported("title")\n')
    const model = readFileSync(join(root, 'reports/models.py'), 'utf8')
    expect(await workspace.references('reports/models.py', model.indexOf('Report'))).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({line: 2, path: 'caller.py'})]),
    })
  })
  it('should follow imports, aliases, reexports, classes and methods with Pyright', async () => {
    const document = workspace.read('main.py')
    expect(document).toMatchObject({ok: true, value: {source}})
    expect(
      document.ok && document.value.lines.flat().some((token) => token.navigation === 'definition'),
    ).toBe(true)
    expect(await workspace.followPath('main.py', source.indexOf('helpers'))).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'helpers.py'}],
    })
    expect(await workspace.definitions('main.py', source.lastIndexOf('welcome'))).toEqual({
      ok: true,
      value: [{column: 5, line: 1, path: 'helpers.py'}],
    })
    expect(await workspace.definitions('main.py', source.lastIndexOf('Report'))).toEqual({
      ok: true,
      value: [{column: 7, line: 1, path: 'reports/models.py'}],
    })
    expect(await workspace.definitions('main.py', source.lastIndexOf('render'))).toEqual({
      ok: true,
      value: [{column: 9, line: 5, path: 'reports/models.py'}],
    })
  })
  it('should resolve relative imports and use edited source without executing the Python project', async () => {
    const factory = readFileSync(join(root, 'reports/factory.py'), 'utf8')
    expect(await workspace.followPath('reports/factory.py', factory.indexOf('models'))).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'reports/models.py'}],
    })
    const changed = `# 한글 🦊\r\n${source.replace('welcome("한글")', 'helpers.greet("한글")')}`
    writeFileSync(join(root, 'main.py'), `${changed}\nraise RuntimeError("Project must not run")\n`)
    expect(await workspace.definitions('main.py', changed.lastIndexOf('greet'))).toEqual({
      ok: true,
      value: [{column: 5, line: 1, path: 'helpers.py'}],
    })
  })
  it('should honor configured import paths and read Python stub definitions', async () => {
    writeFileSync(join(root, 'pyrightconfig.json'), JSON.stringify({extraPaths: ['reports']}))
    const stub = 'class Preview:\n    def render(self) -> str: ...\n'
    writeFileSync(join(root, 'preview.pyi'), stub)
    const main = [
      'from models import Report\nfrom preview import Preview\n',
      'value = Report("title")\nview = Preview()\nview.render()\n',
    ].join('')
    writeFileSync(join(root, 'main.py'), main)
    expect(workspace.read('preview.pyi')).toMatchObject({ok: true, value: {source: stub}})
    expect(await workspace.definitions('main.py', main.lastIndexOf('Report'))).toEqual({
      ok: true,
      value: [{column: 7, line: 1, path: 'reports/models.py'}],
    })
    expect(await workspace.definitions('main.py', main.lastIndexOf('render'))).toEqual({
      ok: true,
      value: [{column: 9, line: 2, path: 'preview.pyi'}],
    })
  })
  it.each([
    ['pyproject.toml', '[tool.pyright]\nextraPaths = ["."]\n'],
    ['pyrightconfig.json', '{"extraPaths":["."]}'],
  ])('should discover %s when opening a nested file outside Git', async (marker, configuration) => {
    writeFileSync(join(root, marker), configuration)
    const factory = 'from helpers import greet\nresult = greet("title")\n'
    writeFileSync(join(root, 'reports/factory.py'), factory)
    workspace.dispose()
    workspace = createWorkspace(join(root, 'reports/factory.py'))
    expect(workspace.root).toBe(root)
    expect(await workspace.definitions('reports/factory.py', factory.lastIndexOf('greet'))).toEqual(
      {
        ok: true,
        value: [{column: 5, line: 1, path: 'helpers.py'}],
      },
    )
  })
})
