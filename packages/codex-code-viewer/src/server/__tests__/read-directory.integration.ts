import {mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readDirectory} from '../read-directory'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'code-tree-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src/main.ts'), '')
  writeFileSync(join(root, 'README.md'), '')
})
afterEach(() => rmSync(root, {force: true, recursive: true}))

describe('readDirectory', () => {
  it('should include non-code files and more than the search result limit', async () => {
    for (let index = 0; index < 120; index += 1) {
      writeFileSync(join(root, `src/file-${index}.js`), '')
    }
    const result = await readDirectory(root)
    expect(result.files).toHaveLength(122)
    expect(result.files).toContainEqual({openable: true, path: 'README.md'})
    expect(result.files).toContainEqual({openable: true, path: 'src/main.ts'})
    expect(result.truncated).toBe(false)
  })

  it('should exclude hidden paths, generated files, and symlinks outside the workspace', async () => {
    for (const directory of ['.secret', 'node_modules', 'dist']) {
      mkdirSync(join(root, directory))
      writeFileSync(join(root, directory, 'hidden.ts'), '')
    }
    symlinkSync('/etc', join(root, 'outside'))
    symlinkSync('/etc/hosts', join(root, 'src/outside.ts'))
    expect((await readDirectory(root)).files.map((file) => file.path).sort()).toEqual([
      'README.md',
      'src/main.ts',
    ])
  })

  it('should expose HTML, ordinary text, and named dotfiles in the tree', async () => {
    for (const path of [
      'index.html',
      '.dockerignore',
      '.gitignore',
      'Dockerfile',
      'settings.custom',
      '.env',
    ]) {
      writeFileSync(join(root, path), 'text')
    }
    const result = await readDirectory(root)
    expect(result.files).toEqual(
      expect.arrayContaining(
        ['index.html', '.dockerignore', '.gitignore', 'Dockerfile', 'settings.custom'].map(
          (path) => ({openable: true, path}),
        ),
      ),
    )
    expect(result.files.map((file) => file.path)).not.toContain('.env')
  })

  it('should include files beyond the former 10000-entry limit', async () => {
    for (let index = 0; index < 10001; index += 1) {
      writeFileSync(join(root, `entry-${index}.txt`), '')
    }
    const result = await readDirectory(root)
    expect(result.files).toHaveLength(10003)
    expect(result.files).toContainEqual({openable: true, path: 'entry-10000.txt'})
    expect(result.truncated).toBe(false)
  })
  it.each([
    {manifest: 'Cargo.toml', paths: ['target']},
    {manifest: 'go.mod', paths: ['vendor']},
    {manifest: 'composer.json', paths: ['vendor']},
    {manifest: 'Gemfile', paths: ['vendor/bundle']},
    {manifest: 'pom.xml', paths: ['target']},
    {manifest: 'build.gradle', paths: ['build']},
    {manifest: 'build.gradle.kts', paths: ['build']},
    {manifest: 'App.csproj', paths: ['bin', 'obj']},
    {manifest: 'App.fsproj', paths: ['bin', 'obj']},
    {manifest: 'App.vbproj', paths: ['bin', 'obj']},
    {manifest: 'mix.exs', paths: ['deps', '_build']},
  ])(
    'should exclude default dependency and output directories for $manifest',
    async ({manifest, paths}) => {
      writeFileSync(join(root, manifest), '')
      for (const path of paths) {
        mkdirSync(join(root, path), {recursive: true})
        writeFileSync(join(root, path, 'dependency.txt'), '')
      }
      const result = await readDirectory(root)
      expect(result.files.map((file) => file.path).sort()).toEqual(
        ['README.md', manifest, 'src/main.ts'].sort(),
      )
      for (const path of paths) {
        expect(result.directories.map((directory) => directory.path)).not.toContain(
          join(realpathSync(root), path),
        )
      }
    },
  )

  it('should exclude Python caches and virtual environments before counting entries', async () => {
    for (const path of ['__pycache__', 'site-packages', 'custom-environment/lib']) {
      mkdirSync(join(root, path), {recursive: true})
      writeFileSync(join(root, path, 'dependency.py'), '')
    }
    writeFileSync(join(root, 'custom-environment/pyvenv.cfg'), 'home = /python')
    const result = await readDirectory(root)
    expect(result.files.map((file) => file.path).sort()).toEqual(['README.md', 'src/main.ts'])
    expect(result.directories).toHaveLength(2)
    expect(result.truncated).toBe(false)
  })

  it('should retain similarly named source directories and gitignored files', async () => {
    writeFileSync(join(root, '.gitignore'), 'src/\n')
    writeFileSync(join(root, 'Cargo.toml'), '')
    for (const path of ['vendor', 'build', 'bin', 'obj', 'venv', 'src/target']) {
      mkdirSync(join(root, path), {recursive: true})
      writeFileSync(join(root, path, 'source.txt'), '')
    }
    const paths = (await readDirectory(root)).files.map((file) => file.path)
    expect(paths).toContain('src/main.ts')
    for (const path of ['vendor', 'build', 'bin', 'obj', 'venv', 'src/target']) {
      expect(paths).toContain(`${path}/source.txt`)
    }
  })
  it('should include all empty directories without a discovery budget', async () => {
    const directory = join(root, 'empty')
    mkdirSync(directory)
    mkdirSync(join(directory, 'first'))
    mkdirSync(join(directory, 'second'))
    const result = await readDirectory(directory)
    expect(result.files).toEqual([])
    expect(result.directories).toHaveLength(3)
    expect(result.truncated).toBe(false)
  })
})
