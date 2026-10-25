import {mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {afterEach, describe, expect, it} from 'vitest'
import {readChanges} from '../read-changes'

const roots: string[] = []
const git = (root: string, ...args: string[]): string =>
  execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'})
const setup = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'viewer-git-'))
  roots.push(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.name', 'Viewer Test')
  git(root, 'config', 'user.email', 'viewer@example.test')
  return root
}
afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, {force: true, recursive: true}))
})

describe('readChanges', () => {
  it('should list all working changes and exclude ignored or private paths', async () => {
    const root = setup()
    for (const file of ['staged.ts', 'modified.ts', 'gone.ts']) {
      writeFileSync(join(root, file), 'before\n')
    }
    writeFileSync(join(root, '.gitignore'), 'ignored.ts\n')
    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'baseline')
    writeFileSync(join(root, 'staged.ts'), 'staged\n')
    git(root, 'add', 'staged.ts')
    writeFileSync(join(root, 'modified.ts'), 'working\n')
    unlinkSync(join(root, 'gone.ts'))
    writeFileSync(join(root, 'new file.ts'), 'new\n')
    writeFileSync(join(root, 'ignored.ts'), 'ignored\n')
    writeFileSync(join(root, '.env'), 'private\n')
    const result = await readChanges(root)
    expect(result.available).toBe(true)
    expect(
      result.files
        .map(({kind, path}) => ({kind, path}))
        .sort((a, b) => a.path.localeCompare(b.path)),
    ).toEqual([
      {kind: 'deleted', path: 'gone.ts'},
      {kind: 'modified', path: 'modified.ts'},
      {kind: 'added', path: 'new file.ts'},
      {kind: 'modified', path: 'staged.ts'},
    ])
  })
  it('should compare branch commits and scope paths to a nested workspace', async () => {
    const root = setup()
    mkdirSync(join(root, 'nested'))
    writeFileSync(join(root, 'nested', 'file.ts'), 'before')
    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'baseline')
    git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD')
    git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main')
    writeFileSync(join(root, 'nested', 'file.ts'), 'committed branch edit')
    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'branch edit')
    writeFileSync(join(root, 'outside.ts'), 'outside')
    const result = await readChanges(join(root, 'nested'))
    expect(result.base).toBe('origin/main')
    expect(result.files.map(({path}) => path)).toEqual(['file.ts'])
  })
  it('should support an unborn repository and report absence outside Git', async () => {
    const root = setup()
    writeFileSync(join(root, 'new.ts'), 'new')
    expect((await readChanges(root)).files[0]).toMatchObject({kind: 'added', path: 'new.ts'})
    const plain = mkdtempSync(join(tmpdir(), 'viewer-plain-'))
    roots.push(plain)
    expect(await readChanges(plain)).toEqual({available: false, base: null, files: []})
  })
})
