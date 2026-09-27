/** @vitest-environment jsdom */

import {type AlbumDraftData} from '../features/admin-music/album-draft'
import {
  COVER_DRAFT_ID,
  createCoverEvent,
  createTranslations,
  flushPromises,
  PREPARED_COVER,
  renderAlbumDraft,
  storageMocks,
  VALID_COVER,
  waitForRestoration,
} from '../features/admin-music/__tests__/fixtures/draft'
import {describe, expect, it, vi} from 'vitest'

describe('album draft field persistence queue', () => {
  it('should not overwrite a persisted cover with a stale queued field snapshot', async () => {
    let releaseSlowWrite: (() => void) | undefined
    const slowWriteGate = new Promise<void>((resolve) => {
      releaseSlowWrite = resolve
    })
    let storedDraft: AlbumDraftData | null = null
    let slowWritePending = false

    storageMocks.writeAlbumDraftData.mockImplementation((draft) => {
      if (draft.hasCoverFile === false && draft.coverDraftId === null && !slowWritePending) {
        slowWritePending = true
        return slowWriteGate.then(() => {
          storedDraft = draft
          return {success: true as const}
        })
      }

      storedDraft = draft
      return {success: true as const}
    })

    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)

    result.handleTranslationsChange({
      ...createTranslations(),
      ko: {description: '수정된 설명', title: '수정된 제목'},
    })
    await flushPromises()

    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

    expect(storageMocks.writeAlbumDraftCover).toHaveBeenCalledWith(COVER_DRAFT_ID, PREPARED_COVER)
    expect(storedDraft).toMatchObject({coverDraftId: COVER_DRAFT_ID, hasCoverFile: true})

    releaseSlowWrite?.()
    await flushPromises()

    expect(storedDraft).toMatchObject({coverDraftId: COVER_DRAFT_ID, hasCoverFile: true})
    cleanup()
  })
})
