/** @vitest-environment node */
import {expect, it} from 'vitest'

import type {ModelDownloadItem, ModelDownloadState} from '../features/model-download/controller'

/** Mirrors `StoragePage` download guard (`StoragePage.tsx`). */
const isModelDownloading = (state: ModelDownloadState) => state.status === 'loading'

const blocksStorageDeletion = (state: ModelDownloadState, _downloads: ReadonlyArray<ModelDownloadItem>) =>
  isModelDownloading(state)

it('should block storage deletion while a model download is still queued', () => {
  const downloads: ReadonlyArray<ModelDownloadItem> = [
    {
      label: 'Queued model',
      status: 'queued',
      target: {kind: 'text', modelId: 'gemma-4-e2b'},
    },
  ]
  const state: ModelDownloadState = {status: 'idle'}

  expect(downloads.some((item) => item.status === 'queued')).toBe(true)
  expect(blocksStorageDeletion(state, downloads)).toBe(true)
})
