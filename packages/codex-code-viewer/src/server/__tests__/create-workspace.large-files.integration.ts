import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

describe('createWorkspace large source navigation', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const source = [
    "import {greet as largeAlias} from './core'\r\nlargeAlias()\r\n",
    '// 한😀 padding line\r\n'.repeat(45000),
  ].join('')
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-large-navigation-')))
    mkdirSync(join(root, '.git'))
    mkdirSync(join(root, 'outside'))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'core.ts'), 'export const greet = () => 42\n')
    writeFileSync(join(root, 'large.ts'), source)
    writeFileSync(join(root, 'outside/use.ts'), "import {greet as hello} from '../core'\nhello()\n")
    writeFileSync(join(root, 'unrelated.ts'), 'const greet = () => 1; greet()\n')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace?.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  const query = async (path: string, offset: number) => {
    const document = workspace.read(path)
    if (!document.ok) {
      throw new Error(document.error.code)
    }
    const batches = await Array.fromAsync(
      workspace.scanNavigation(
        {navigation: 'definition', offset, path, revision: document.value.revision},
        new AbortController().signal,
      ),
    )
    return [
      ...new Set(
        batches
          .flatMap((batch) => batch.locations)
          .map(({path, line, column}) => JSON.stringify([path, line, column])),
      ),
    ].sort()
  }
  it('should follow a mixed-newline alias in an unhighlighted readonly document', async () => {
    expect(Buffer.byteLength(source, 'utf8')).toBeGreaterThan(1048576)
    expect(workspace.read('large.ts')).toMatchObject({ok: true, value: {lines: [], readOnly: true}})
    const positions = await query('large.ts', source.indexOf('largeAlias()') + 2)
    expect(positions).toEqual([JSON.stringify(['core.ts', 1, 14])])
  })
  it('should retain all large and external consumer references without unrelated identifiers', async () => {
    const expected = ['large.ts', 'outside/use.ts']
      .flatMap((path) => [
        [path, 1, 9],
        [path, 1, 18],
        [path, 2, 1],
      ])
      .map((entry) => JSON.stringify(entry))
      .sort()
    expect(await query('core.ts', 15)).toEqual(expected)
    expect(await query('core.ts', 15)).toEqual(expected)
  })
})
