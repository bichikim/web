import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createNavigationIndex} from '../create-navigation-index'
import {createSourceIndexStore} from '../create-source-index-store'
import * as summaries from '../summarize-source'

const roots: string[] = []
const setup = () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'index-persistence-')))
  roots.push(directory)
  const root = join(directory, 'workspace')
  mkdirSync(join(root, 'core'), {recursive: true})
  mkdirSync(join(root, 'outside'), {recursive: true})
  writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true}}')
  writeFileSync(join(root, 'core/entry.ts'), 'export const greet = () => 1')
  writeFileSync(join(root, 'outside/barrel.ts'), "export {greet as welcome} from '../core/entry'")
  writeFileSync(join(root, 'outside/use.ts'), "import {welcome as hello} from './barrel'; hello()")
  const create = () =>
    createNavigationIndex({
      changes: {subscribeChanges: () => () => {}},
      root,
      storage: createSourceIndexStore({directory: join(directory, 'cache'), root}),
    })
  return {create, root, signal: new AbortController().signal}
}
afterEach(() => {
  vi.restoreAllMocks()
  roots.splice(0).forEach((root) => rmSync(root, {force: true, recursive: true}))
})
describe('createNavigationIndex persisted summaries', () => {
  it('should restore cross-package alias candidates without reparsing unchanged sources', async () => {
    const {create, signal} = setup()
    const first = create()
    await first.checkpoint(signal)
    await first.refresh(signal)
    first.dispose()
    const summarize = vi.spyOn(summaries, 'summarizeSource')
    const second = create()
    try {
      await second.checkpoint(signal)
      await second.restore?.()
      expect(second.candidates?.(['core/entry.ts'], 'greet')).toEqual([
        'core/entry.ts',
        'outside/barrel.ts',
        'outside/use.ts',
      ])
      await second.refresh(signal)
      expect(summarize).not.toHaveBeenCalled()
    } finally {
      second.dispose()
    }
  })
  it('should detect edits, additions and deletions after restart without watcher events', async () => {
    const {root, create, signal} = setup()
    const first = create()
    await first.checkpoint(signal)
    await first.refresh(signal)
    first.dispose()
    writeFileSync(join(root, 'outside/barrel.ts'), "export {greet as renamed} from '../core/entry'")
    rmSync(join(root, 'outside/use.ts'))
    writeFileSync(
      join(root, 'outside/new.ts'),
      "import {renamed as hello} from './barrel'; hello()",
    )
    const summarize = vi.spyOn(summaries, 'summarizeSource')
    const second = create()
    try {
      await second.checkpoint(signal)
      await second.refresh(signal)
      expect(second.candidates?.(['core/entry.ts'], 'greet')).toEqual([
        'core/entry.ts',
        'outside/barrel.ts',
        'outside/new.ts',
      ])
      expect(summarize).toHaveBeenCalledTimes(2)
    } finally {
      second.dispose()
    }
  })
  it('should discard saved relationships when compiler configuration changes', async () => {
    const {root, create, signal} = setup()
    const first = create()
    await first.checkpoint(signal)
    await first.refresh(signal)
    first.dispose()
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":false}}')
    const second = create()
    try {
      await second.checkpoint(signal)
      await second.restore?.()
      expect(second.candidates?.([], 'greet')).toEqual([])
      await second.refresh(signal)
      expect(second.candidates?.(['core/entry.ts'], 'greet')).toContain('outside/use.ts')
    } finally {
      second.dispose()
    }
  })
})
