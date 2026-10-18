import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import {createNavigationIndex} from '../create-navigation-index'

describe('createNavigationIndex', () => {
  it('should share discovery while cancelling only one checkpoint waiter', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-checkpoint-shared-')))
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1')
    const configure = vi.fn()
    const index = createNavigationIndex({
      changes: {subscribeChanges: () => () => {}},
      onConfigurationChange: configure,
      root,
    })
    const controller = new AbortController()
    const signal = new AbortController().signal
    try {
      const cancelled = index.checkpoint(controller.signal)
      const first = index.checkpoint(signal)
      const second = index.checkpoint(signal)
      controller.abort()
      await expect(cancelled).rejects.toThrow()
      expect(await first).toBe(await second)
      expect(configure).not.toHaveBeenCalled()
      expect(await (await first).unchanged(signal)).toBe(true)
      expect(await index.checkpoint(signal)).toBe(await first)
      expect(configure).not.toHaveBeenCalled()
    } finally {
      index.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should retain analyzers across cold lookups and reset them when configuration changes', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-index-')))
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true}}')
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1')
    const configure = vi.fn()
    const index = createNavigationIndex({
      changes: {subscribeChanges: () => () => {}},
      onConfigurationChange: configure,
      root,
    })
    const signal = new AbortController().signal
    try {
      const checkpoint = await index.checkpoint(signal)
      expect(configure).not.toHaveBeenCalled()
      await index.checkpoint(signal)
      expect(configure).not.toHaveBeenCalled()
      await index.refresh(signal)
      expect(configure).not.toHaveBeenCalled()
      expect(await checkpoint.unchanged(signal)).toBe(true)
      writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":false}}')
      await index.checkpoint(signal)
      expect(configure).toHaveBeenCalledOnce()
      await index.refresh(signal)
      expect(configure).toHaveBeenCalledOnce()
    } finally {
      index.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
  it('should detect new aliases, deleted files and new configuration without watcher notifications', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-index-')))
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1')
    const configure = vi.fn()
    const stop = vi.fn()
    const index = createNavigationIndex({
      changes: {subscribeChanges: () => stop},
      onConfigurationChange: configure,
      root,
    })
    const signal = new AbortController().signal
    try {
      const initial = await index.refresh(signal)
      const scope = index.scope(['helper.ts'], 'greet')
      expect(index.changed(scope, initial)).toEqual(new Set())
      writeFileSync(join(root, 'new.ts'), "import {greet as hello} from './helper'\nhello()")
      const added = await index.refresh(signal)
      expect(index.changed(index.scope(['helper.ts'], 'greet'), initial)).toEqual(
        new Set(['new.ts']),
      )
      expect(index.uncertain(added)).toBe(false)
      rmSync(join(root, 'new.ts'))
      const removed = await index.refresh(signal)
      expect(index.changed(new Set(['new.ts']), added)).toEqual(new Set(['new.ts']))
      writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true}}')
      const configured = await index.refresh(signal)
      expect(index.uncertain(removed)).toBe(true)
      expect(configure).toHaveBeenCalledOnce()
      expect(await index.refresh(signal)).toBe(configured)
      expect(configure).toHaveBeenCalledOnce()
    } finally {
      index.dispose()
      rmSync(root, {force: true, recursive: true})
    }
    expect(stop).toHaveBeenCalledOnce()
  })
})
