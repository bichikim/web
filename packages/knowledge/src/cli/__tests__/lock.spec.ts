import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {expect, it} from 'vitest'

import {withKnowledgeLock} from '../lock'

it('should reject concurrent writes and release the lock after failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'knowledge-lock-'))
  try {
    await expect(
      withKnowledgeLock(directory, async () => {
        await expect(withKnowledgeLock(directory, async () => 'unexpected')).rejects.toThrow(
          'Index already running',
        )
        throw new Error('write failed')
      }),
    ).rejects.toThrow('write failed')
    await expect(withKnowledgeLock(directory, async () => 'released')).resolves.toBe('released')
  } finally {
    await rm(directory, {force: true, recursive: true})
  }
})
