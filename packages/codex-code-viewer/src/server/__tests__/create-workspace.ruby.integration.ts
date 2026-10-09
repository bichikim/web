import {cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'
import {resolveNavigation} from '../resolve-navigation'

describe('createWorkspace Ruby navigation', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  let source: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'ruby-navigation-')))
    cpSync(new URL('./fixtures/ruby', import.meta.url), root, {recursive: true})
    source = readFileSync(join(root, 'main.rb'), 'utf8')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should find a Ruby method usage with Solargraph', async () => {
    const helper = readFileSync(join(root, 'lib/helpers.rb'), 'utf8')
    const document = workspace.read('lib/helpers.rb')
    expect(document.ok).toBe(true)
    if (document.ok) {
      expect(
        await resolveNavigation({
          document: document.value,
          navigation: 'definition',
          offset: helper.indexOf('greet') + 2,
          path: 'lib/helpers.rb',
          workspace,
        }),
      ).toMatchObject({
        ok: true,
        value: {
          kind: 'references',
          locations: expect.arrayContaining([expect.objectContaining({path: 'main.rb'})]),
        },
      })
    }
    expect(await workspace.references('lib/helpers.rb', helper.indexOf('greet'))).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({path: 'main.rb'})]),
    })
  }, 30000)
  it('should resolve require paths, namespaced classes and methods with Solargraph', async () => {
    expect(workspace.read('main.rb')).toMatchObject({ok: true, value: {source}})
    expect(await workspace.followPath('main.rb', source.indexOf('lib/reports/report'))).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'lib/reports/report.rb'}],
    })
    expect(
      await workspace.followPath(
        'main.rb',
        source.indexOf("reports/report'", source.indexOf("require '")),
      ),
    ).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'lib/reports/report.rb'}],
    })
    expect(await workspace.definitions('main.rb', source.lastIndexOf('Report.new'))).toMatchObject({
      ok: true,
      value: [{line: 2, path: 'lib/reports/report.rb'}],
    })
    expect(await workspace.definitions('main.rb', source.lastIndexOf('render!'))).toMatchObject({
      ok: true,
      value: [{line: 7, path: 'lib/reports/report.rb'}],
    })
    expect(await workspace.definitions('main.rb', source.lastIndexOf('greet'))).toMatchObject({
      ok: true,
      value: [{line: 2, path: 'lib/helpers.rb'}],
    })
  }, 30000)
  it('should synchronize changed source with UTF-16 positions without running the Ruby file', async () => {
    expect(await workspace.definitions('main.rb', source.lastIndexOf('greet'))).toMatchObject({
      ok: true,
    })
    const changed = `# 한글 🦊\r\n${source}\nHelpers.greet("changed")\nraise "Project must not run"\n`
    writeFileSync(join(root, 'main.rb'), changed)
    expect(await workspace.definitions('main.rb', changed.lastIndexOf('greet'))).toMatchObject({
      ok: true,
      value: [{line: 2, path: 'lib/helpers.rb'}],
    })
  }, 30000)
  it('should find the Ruby project root when opening a nested file outside Git', async () => {
    workspace.dispose()
    workspace = createWorkspace(join(root, 'lib/reports/report.rb'))
    expect(workspace.root).toBe(root)
    expect(workspace.read('Gemfile')).toMatchObject({ok: true})
    const helper = readFileSync(join(root, 'lib/helpers.rb'), 'utf8')
    expect(await workspace.definitions('lib/helpers.rb', helper.indexOf('Helpers'))).toMatchObject({
      ok: true,
    })
  }, 30000)
  it('should reindex new declarations after the same file changes', async () => {
    await workspace.definitions('main.rb', source.lastIndexOf('greet'))
    const changed =
      '# 한글 🦊\r\nclass Preview\n  def ready?\n    true\n  end\nend\nPreview.new.ready?\n'
    writeFileSync(join(root, 'main.rb'), changed)
    expect(await workspace.definitions('main.rb', changed.lastIndexOf('ready?'))).toMatchObject({
      ok: true,
      value: [{line: 3, path: 'main.rb'}],
    })
  }, 30000)
})
