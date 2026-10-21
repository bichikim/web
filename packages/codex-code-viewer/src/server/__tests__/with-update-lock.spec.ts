/** @vitest-environment node */
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {withUpdateLock} from '../with-update-lock'

describe('withUpdateLock', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'viewer-update-lock-'))
  })
  afterEach(async () => {
    await rm(root, {force: true, recursive: true})
  })
  it('should reject competing work for one profile and release the lock on completion', async () => {
    const started = Promise.withResolvers<void>()
    const finish = Promise.withResolvers<void>()
    const first = withUpdateLock(root, () => {
      started.resolve()
      return finish.promise
    })
    await started.promise
    const second = vi.fn()
    try {
      await expect(withUpdateLock(root, second)).rejects.toMatchObject({code: 'update-in-progress'})
      expect(second).not.toHaveBeenCalled()
    } finally {
      finish.resolve()
      await first
    }
    await withUpdateLock(root, second)
    expect(second).toHaveBeenCalledOnce()
  })
  it('should allow independent profiles to update concurrently', async () => {
    await withUpdateLock(join(root, 'first'), async () => {
      await expect(withUpdateLock(join(root, 'second'), async () => {})).resolves.toBeUndefined()
    })
  })
  it('should preserve an installation failure and release its lock for retry', async () => {
    const error = new Error('installation failed')
    await expect(
      withUpdateLock(root, async () => {
        throw error
      }),
    ).rejects.toBe(error)
    await expect(withUpdateLock(root, async () => {})).resolves.toBeUndefined()
  })
})
