import {cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

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
