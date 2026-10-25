import {mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {afterEach, expect, it} from 'vitest'
import {readBaseline} from '../read-baseline'

const roots: string[] = []
afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, {force: true, recursive: true}))
})
it('should read deleted baseline text in a nested workspace and reject out-of-scope and private paths', async () => {
  const root = mkdtempSync(join(tmpdir(), 'viewer-baseline-'))
  roots.push(root)
  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', root, ...args])
  }
  git('init', '-q')
  git('config', 'user.name', 'Viewer Test')
  git('config', 'user.email', 'viewer@example.test')
  mkdirSync(join(root, 'nested'))
  writeFileSync(join(root, 'nested', 'name with space.ts'), 'previous\n')
  writeFileSync(join(root, 'nested', 'binary.png'), Buffer.from([0, 1]))
  writeFileSync(join(root, 'nested', 'unicode.ts'), 'const replacement = "\ufffd"\n')
  writeFileSync(join(root, 'nested', 'invalid.ts'), Buffer.from([0xff, 0xfe]))
  git('add', '.')
  git('commit', '-qm', 'baseline')
  unlinkSync(join(root, 'nested', 'name with space.ts'))
  const workspace = join(root, 'nested')
  expect((await readBaseline(workspace, 'name with space.ts')).source).toBe('previous\n')
  expect((await readBaseline(workspace, 'new.ts')).source).toBe('')
  expect((await readBaseline(workspace, 'binary.png')).source).toBeNull()
  expect((await readBaseline(workspace, 'unicode.ts')).source).toBe(
    'const replacement = "\ufffd"\n',
  )
  expect((await readBaseline(workspace, 'invalid.ts')).source).toBeNull()
  await expect(readBaseline(workspace, '../outside.ts')).rejects.toThrow('outside')
  await expect(readBaseline(workspace, '.env')).rejects.toThrow('outside')
})
