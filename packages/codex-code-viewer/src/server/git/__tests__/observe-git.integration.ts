import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {expect, it, vi} from 'vitest'
import {observeGit} from '../observe-git'

it('should observe index events stored outside a linked worktree', async () => {
  const root = mkdtempSync(join(tmpdir(), 'viewer-git-watch-'))
  const git = (...args: string[]): void => {
    execFileSync('git', ['-C', root, ...args])
  }
  let dispose = (): void => {}
  try {
    git('init', '-q')
    git('config', 'user.name', 'Viewer Test')
    git('config', 'user.email', 'viewer@example.test')
    writeFileSync(join(root, 'file.ts'), 'before')
    git('add', '.')
    git('commit', '-qm', 'baseline')
    const worktree = join(root, 'linked')
    git('worktree', 'add', '--detach', worktree, 'HEAD')
    writeFileSync(join(worktree, 'file.ts'), 'after')
    const observer = observeGit(worktree)
    dispose = observer.dispose
    await observer.ready
    const event = Promise.withResolvers<void>()
    const listener = vi.fn(() => event.resolve())
    observer.subscribe(listener)
    execFileSync('git', ['-C', worktree, 'add', 'file.ts'])
    await event.promise
    expect(listener).toHaveBeenCalled()
  } finally {
    dispose()
    rmSync(root, {force: true, recursive: true})
  }
})
