import {describe, expect, it, vi} from 'vitest'

import {formatModelDownloadSize, type ModelStorage} from '../../model-storage'
import {isSupertonicModelDownloaded} from '../download'
import {getSupertonicModel} from '../model'
import {successResult} from '../../result'

const createStorage = (): ModelStorage => ({
  delete: vi.fn(async () => successResult(false)),
  get: vi.fn(async () => successResult(new Response('model'))),
  set: vi.fn(async () => successResult(undefined)),
})

describe('isSupertonicModelDownloaded', () => {
  it('should require every model file to be cached', async () => {
    const storage = createStorage()

    await expect(isSupertonicModelDownloaded({modelId: 'full', storage})).resolves.toBe(true)
    expect(storage.get).toHaveBeenCalledTimes(getSupertonicModel('full').files.length)
  })

  it('should report a missing or unreadable model file as not downloaded', async () => {
    const missingStorage = createStorage()
    vi.mocked(missingStorage.get).mockResolvedValueOnce(successResult(null))

    await expect(
      isSupertonicModelDownloaded({modelId: 'int8', storage: missingStorage}),
    ).resolves.toBe(false)

    const unreadableStorage = createStorage()
    vi.mocked(unreadableStorage.get).mockResolvedValueOnce({
      error: {cause: new Error('cache unavailable'), operation: 'read'},
      ok: false,
    })
    await expect(
      isSupertonicModelDownloaded({modelId: 'int8', storage: unreadableStorage}),
    ).resolves.toBe(false)
  })
})

describe('formatModelDownloadSize', () => {
  it('should format model sizes in readable binary units', () => {
    expect(formatModelDownloadSize(398_075_273)).toBe('약 380MB')
    expect(formatModelDownloadSize(3.7 * 1024 * 1024 * 1024)).toBe('약 3.7GB')
  })
})
