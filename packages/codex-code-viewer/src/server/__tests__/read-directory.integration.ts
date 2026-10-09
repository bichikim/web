import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
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
  it('should include non-code files and more than the search result limit', () => {
    for (let index = 0; index < 120; index += 1) {
      writeFileSync(join(root, `src/file-${index}.js`), '')
    }
    const result = readDirectory(root)
    expect(result.files).toHaveLength(122)
    expect(result.files).toContainEqual({openable: true, path: 'README.md'})
    expect(result.files).toContainEqual({openable: true, path: 'src/main.ts'})
    expect(result.truncated).toBe(false)
  })

  it('should exclude hidden paths, generated files, and symlinks outside the workspace', () => {
    for (const directory of ['.secret', 'node_modules', 'dist']) {
      mkdirSync(join(root, directory))
      writeFileSync(join(root, directory, 'hidden.ts'), '')
    }
    symlinkSync('/etc', join(root, 'outside'))
    symlinkSync('/etc/hosts', join(root, 'src/outside.ts'))
    expect(
      readDirectory(root)
        .files.map((file) => file.path)
        .sort(),
    ).toEqual(['README.md', 'src/main.ts'])
  })

  it('should expose HTML, ordinary text, and named dotfiles in the tree', () => {
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
    const result = readDirectory(root)
    expect(result.files).toEqual(
      expect.arrayContaining(
        ['index.html', '.dockerignore', '.gitignore', 'Dockerfile', 'settings.custom'].map(
          (path) => ({openable: true, path}),
        ),
      ),
    )
    expect(result.files.map((file) => file.path)).not.toContain('.env')
  })

  it('should report truncation at the requested budget', () => {
    const result = readDirectory(root, 1)
    expect(result.files).toHaveLength(1)
    expect(result.truncated).toBe(true)
  })
  it('should count empty directories toward the discovery budget', () => {
    const directory = join(root, 'empty')
    mkdirSync(directory)
    mkdirSync(join(directory, 'first'))
    mkdirSync(join(directory, 'second'))
    const result = readDirectory(directory, 1)
    expect(result.files).toEqual([])
    expect(result.directories).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })
})
