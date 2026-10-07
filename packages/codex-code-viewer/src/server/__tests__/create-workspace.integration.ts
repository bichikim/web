import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createWorkspace} from '../create-workspace'

describe('createWorkspace', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const source =
    "import {answer as value} from './barrel'\nimport {extra} from '~/extra'\nexport const result = value + extra\n"
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'code-viewer-'))
    mkdirSync(join(root, '.git'))
    mkdirSync(join(root, 'src'))
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'esnext',
          moduleResolution: 'bundler',
          noLib: true,
          paths: {'~/*': ['src/*']},
          types: [],
        },
      }),
    )
    writeFileSync(join(root, 'src/main.ts'), source)
    writeFileSync(join(root, 'src/barrel.ts'), "export {answer} from './answer'\n")
    writeFileSync(join(root, 'src/answer.ts'), 'export const answer = 42\n')
    writeFileSync(join(root, 'src/extra.ts'), 'export const extra = 1\n')
    workspace = createWorkspace(join(root, 'src/main.ts'))
  })
  afterEach(() => {
    workspace.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should resolve renamed imports through a barrel to the source definition', () => {
    expect(workspace.definitions('src/main.ts', source.lastIndexOf('value'))).toEqual({
      ok: true,
      value: [{column: 14, line: 1, path: 'src/answer.ts'}],
    })
  })
  it.each(['js', 'jsx', 'mjs', 'mts'])(
    'should read, search, and navigate %s files with an existing TypeScript configuration',
    (extension) => {
      const path = `src/view.${extension}`
      const dependency = `src/helper.${extension}`
      const text = `import {answer} from './helper.${extension}'\nexport const result = answer\n`
      writeFileSync(join(root, path), text)
      writeFileSync(join(root, dependency), 'export const answer = 42\n')
      expect(workspace.read(path)).toMatchObject({ok: true, value: {source: text}})
      expect(workspace.list(`view.${extension}`)).toEqual([path])
      expect(workspace.followPath(path, text.indexOf("'./helper"))).toEqual({
        ok: true,
        value: [{column: 1, line: 1, path: dependency}],
      })
      expect(workspace.definitions(path, text.lastIndexOf('answer'))).toEqual({
        ok: true,
        value: [{column: 14, line: 1, path: dependency}],
      })
    },
  )
  it('should find general text and named ignore files by search', () => {
    writeFileSync(join(root, '.dockerignore'), 'dist\n')
    writeFileSync(join(root, 'index.html'), '<main>source</main>')
    writeFileSync(join(root, 'settings.custom'), 'setting=value')
    expect(workspace.list('dockerignore')).toEqual(['.dockerignore'])
    expect(workspace.list('index.html')).toEqual(['index.html'])
    expect(workspace.list('settings.custom')).toEqual(['settings.custom'])
  })
  it('should resolve tsconfig aliases and relative module paths', () => {
    expect(workspace.followPath('src/main.ts', source.indexOf("'~/extra'"))).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'src/extra.ts'}],
    })
    expect(workspace.followPath('src/main.ts', source.indexOf("'./barrel'"))).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'src/barrel.ts'}],
    })
  })
  it('should reload edited dependency definitions', () => {
    workspace.definitions('src/main.ts', source.lastIndexOf('value'))
    writeFileSync(join(root, 'src/answer.ts'), '\n\nexport const answer = 43\n')
    expect(workspace.definitions('src/main.ts', source.lastIndexOf('value'))).toMatchObject({
      ok: true,
      value: [{line: 3}],
    })
  })
  it('should reject traversal and symlinks outside the workspace', () => {
    symlinkSync('/etc/hosts', join(root, 'src/outside.ts'))
    expect(workspace.read('../outside.ts')).toMatchObject({
      error: {code: 'outside-workspace'},
      ok: false,
    })
    expect(workspace.read('src/outside.ts')).toMatchObject({
      error: {code: 'outside-workspace'},
      ok: false,
    })
  })
  it('should exclude generated and hidden files from file search', () => {
    mkdirSync(join(root, 'node_modules'))
    writeFileSync(join(root, 'node_modules/hidden.ts'), '')
    expect(workspace.list('answer')).toEqual(['src/answer.ts'])
    expect(workspace.list('hidden')).toEqual([])
  })
  it.each([
    'md',
    'mdx',
    'txt',
    'png',
    'mp4',
    'rs',
    'yaml',
    'yml',
    'toml',
    'jsonc',
    'json5',
    'lock',
  ])('should expose %s files in search and the file tree', (extension) => {
    const path = `src/document.${extension}`
    writeFileSync(join(root, path), 'document')
    expect(workspace.list(`document.${extension}`)).toEqual([path])
    expect(workspace.tree().files).toContainEqual({openable: true, path})
  })
})
