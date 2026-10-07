/** @vitest-environment jsdom */

import {waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {COVER_STORAGE_WARNING} from '../album-draft-persistence'
import {
  COVER_DRAFT_ID,
  coverMocks,
  createCoverEvent,
  createDraft,
  createSubmitEvent,
  createTranslations,
  PREPARED_COVER,
  renderAlbumDraft,
  storageMocks,
  VALID_COVER,
  waitForRestoration,
} from './fixtures/draft'

it.each(['result', 'rejection'] as const)(
  'should retain an in-memory cover and its storage warning after a cover storage %s and album submission failure',
  async (coverStorageFailure) => {
    let storedDraft = createDraft()
    storageMocks.readAlbumDraftData.mockImplementation(() => storedDraft)
    storageMocks.writeAlbumDraftData.mockImplementation((draft) => {
      storedDraft = draft
      return {success: true}
    })

    const {cleanup, result, setMessage} = renderAlbumDraft()
    try {
      await waitForRestoration(result)
      storageMocks.writeAlbumDraftData.mockClear()
      if (coverStorageFailure === 'result') {
        storageMocks.writeAlbumDraftCover.mockResolvedValueOnce({error: 'quota', success: false})
      } else {
        storageMocks.writeAlbumDraftCover.mockRejectedValueOnce(new Error('quota'))
      }

      await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

      const coverWarning =
        coverStorageFailure === 'result' ? COVER_STORAGE_WARNING : `${COVER_STORAGE_WARNING}\nquota`
      expect(result.coverPreviewUrl()).toBe('blob:album-cover')
      expect(setMessage).toHaveBeenLastCalledWith(coverWarning)

      const translations = {
        ...createTranslations(),
        ko: {description: '', title: '수정된 제목'},
      }
      result.handleTranslationsChange(translations)
      await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce())
      expect(storedDraft).toMatchObject({coverDraftId: null, hasCoverFile: false})

      storageMocks.writeAlbumDraftData.mockClear()
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({error: 'server error'}, {status: 500}))
      await result.handleAlbumSubmit(createSubmitEvent().event)

      expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(PREPARED_COVER, COVER_DRAFT_ID)
      expect(result.coverPreviewUrl()).toBe('blob:album-cover')
      expect
        .soft(setMessage)
        .toHaveBeenLastCalledWith(
          `${coverWarning}\n저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.`,
        )
      expect(storedDraft).toMatchObject({
        coverDraftId: null,
        hasCoverFile: false,
        translations,
      })
    } finally {
      cleanup()
    }
  },
)
