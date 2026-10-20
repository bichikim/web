/** @vitest-environment jsdom */
import {waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createDeferred} from 'src/__tests__/create-deferred'
import {
  createCoverEvent,
  createDraft,
  PREPARED_COVER,
  renderAlbumDraft,
  storageMocks,
  VALID_COVER,
} from './fixtures/draft'

afterEach(() => {
  vi.clearAllMocks()
})

it.each(['clear', 'replace'] as const)(
  'should hold a %s operation until restoration finishes and persist the selected cover state',
  async (operation) => {
    const restoration = createDeferred<{success: true}>()
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.readAlbumDraftCover.mockResolvedValue(PREPARED_COVER)
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(restoration.promise)
    const view = renderAlbumDraft()
    try {
      await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
      let completed = false
      const change = Promise.resolve(
        view.result.handleCoverChange(
          createCoverEvent(operation === 'clear' ? null : VALID_COVER).event,
        ),
      ).then(() => {
        completed = true
      })
      if (operation === 'replace') {
        await waitFor(() => expect(view.result.coverPreviewUrl()).toBe('blob:album-cover'))
      } else {
        await Promise.resolve()
      }
      expect(completed).toBe(false)
      expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
      expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()

      restoration.resolve({success: true})
      await change

      expect(completed).toBe(true)
      expect(view.result.isRestoringDraft()).toBe(false)
      expect(storageMocks.writeAlbumDraftData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          coverDraftId: operation === 'clear' ? null : expect.any(String),
          hasCoverFile: operation === 'replace',
        }),
      )
      expect(storageMocks.writeAlbumDraftCover).toHaveBeenCalledTimes(operation === 'clear' ? 0 : 1)
    } finally {
      restoration.resolve({success: true})
      view.cleanup()
    }
  },
)

it.each(['clear', 'replace'] as const)(
  'should release a waiting %s operation on cleanup without persisting after disposal',
  async (operation) => {
    const restoration = createDeferred<{success: true}>()
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(restoration.promise)
    const view = renderAlbumDraft()
    try {
      await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
      const change = view.result.handleCoverChange(
        createCoverEvent(operation === 'clear' ? null : VALID_COVER).event,
      )
      if (operation === 'replace') {
        await waitFor(() => expect(view.result.coverPreviewUrl()).toBe('blob:album-cover'))
      }
      view.cleanup()
      await change

      expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()
      expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
      expect(view.result.coverPreviewUrl()).toBeNull()
      expect(view.result.isProcessingCover()).toBe(false)
      restoration.resolve({success: true})
      await restoration.promise
      expect(view.setMessage).toHaveBeenLastCalledWith(null)
      expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
    } finally {
      restoration.resolve({success: true})
      view.cleanup()
    }
  },
)

it('should discard an older cover operation when another clear supersedes it during restoration', async () => {
  const restoration = createDeferred<{success: true}>()
  storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(restoration.promise)
  const view = renderAlbumDraft()
  try {
    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    const replacement = view.result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    await waitFor(() => expect(view.result.coverPreviewUrl()).toBe('blob:album-cover'))
    const clearing = view.result.handleCoverChange(createCoverEvent(null).event)
    restoration.resolve({success: true})
    await Promise.all([replacement, clearing])

    expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce()
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith(
      expect.objectContaining({coverDraftId: null, hasCoverFile: false}),
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:album-cover')
  } finally {
    restoration.resolve({success: true})
    view.cleanup()
  }
})

it('should release a waiting clear after restoration fails while retaining the existing error report', async () => {
  const restoration = createDeferred<{success: true}>()
  const failure = new Error('restore failed')
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(restoration.promise)
  const view = renderAlbumDraft()
  try {
    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    const clearing = view.result.handleCoverChange(createCoverEvent(null).event)
    restoration.reject(failure)
    await clearing

    expect(warning).toHaveBeenCalledWith('Failed to restore the admin album draft.', failure)
    expect(view.result.isRestoringDraft()).toBe(false)
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce()
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith(
      expect.objectContaining({coverDraftId: null, hasCoverFile: false}),
    )
  } finally {
    restoration.resolve({success: true})
    view.cleanup()
  }
})
