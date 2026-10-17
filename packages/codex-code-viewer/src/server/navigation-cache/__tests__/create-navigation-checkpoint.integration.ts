import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readPathRevisions} from '../read-path-revisions'
import {expect, it} from 'vitest'
import {createNavigationCheckpoint} from '../create-navigation-checkpoint'

it('should detect edits, membership and configuration changes without watcher notifications', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-checkpoint-')))
  const signal = new AbortController().signal
  try {
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 1')
    const original = await createNavigationCheckpoint(root, signal)
    expect(await original.unchanged(signal)).toBe(true)
    writeFileSync(join(root, 'helper.ts'), 'export const greet = () => 2')
    expect(await original.unchanged(signal)).toBe(false)
    const edited = await createNavigationCheckpoint(root, signal)
    writeFileSync(join(root, 'caller.ts'), "import {greet} from './helper'\ngreet()")
    expect(await edited.unchanged(signal)).toBe(false)
    const added = await createNavigationCheckpoint(root, signal)
    rmSync(join(root, 'caller.ts'))
    expect(await added.unchanged(signal)).toBe(false)
    const removed = await createNavigationCheckpoint(root, signal)
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true}}')
    expect(await removed.unchanged(signal)).toBe(false)
    const configured = await createNavigationCheckpoint(root, signal)
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":false}}')
    expect(await configured.unchanged(signal)).toBe(false)
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(configured.unchanged(cancelled.signal)).rejects.toThrow()
  } finally {
    rmSync(root, {force: true, recursive: true})
  }
})

it('should include analyzer inputs while preserving the earlier source checkpoint', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'navigation-checkpoint-inputs-')))
  const signal = new AbortController().signal
  const helper = join(root, 'helper.ts')
  const external = join(root, 'external.json')
  try {
    writeFileSync(helper, 'export const greet = () => 1')
    writeFileSync(external, '{}')
    const original = await createNavigationCheckpoint(root, signal)
    const inputs = await readPathRevisions([helper, external], signal)
    const checkpoint = original.include(
      new Map([...inputs].map(([path, revision]) => [path, revision ?? 'unreadable'])),
    )
    expect(await checkpoint.unchanged(signal)).toBe(true)
    writeFileSync(external, '{"changed":true}')
    expect(await checkpoint.unchanged(signal)).toBe(false)
    writeFileSync(helper, 'export const greet = () => 2')
    const latest = await readPathRevisions([helper], signal)
    expect(
      await original
        .include(new Map([...latest].map(([path, revision]) => [path, revision ?? 'unreadable'])))
        .unchanged(signal),
    ).toBe(false)
  } finally {
    rmSync(root, {force: true, recursive: true})
  }
})
