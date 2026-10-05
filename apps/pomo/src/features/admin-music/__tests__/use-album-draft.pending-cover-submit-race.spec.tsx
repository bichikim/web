/** @vitest-environment jsdom */

import {waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {
  coverMocks,
  createCoverEvent,
  createSubmitEvent,
  renderAlbumDraft,
  storageMocks,
  waitForRestoration,
} from './fixtures/draft'

const SOURCE_B = new File(['source b'], 'source-b.png', {type: 'image/png'})
const PREPARED_B = new File(['prepared b'], 'cover-b.webp', {type: 'image/webp'})

it('should preserve a cover selection still being prepared when the earlier album POST succeeds', async () => {
  const {cleanup, result} = renderAlbumDraft()
  let resolvePost: (response: Response) => void = () => undefined
  let resolvePreparation: (file: File) => void = () => undefined
  let pendingSelection: Promise<void> | null = null

  try {
    await waitForRestoration(result)
    const originalTranslations = result.albumTranslations()
    const originalCoverImageUrl = result.coverImageUrl()
    const originalCoverFallback = result.coverFallback()

    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )
    const pendingAlbumSubmit = result.handleAlbumSubmit(
      createSubmitEvent().event,
    ) as unknown as Promise<void>
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())

    coverMocks.prepareAlbumCover.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePreparation = resolve
        }),
    )
    pendingSelection = result.handleCoverChange(
      createCoverEvent(SOURCE_B).event,
    ) as unknown as Promise<void>
    await waitFor(() => expect(coverMocks.prepareAlbumCover).toHaveBeenCalledOnce())
    expect(result.isProcessingCover()).toBe(true)
    expect(result.coverPreviewUrl()).toBeNull()

    resolvePost(
      new Response(JSON.stringify({id: 'created-album-a'}), {
        headers: {'Content-Type': 'application/json'},
        status: 201,
      }),
    )
    await pendingAlbumSubmit

    const stateWhileBIsStillPreparing = {
      coverFallback: result.coverFallback(),
      coverImageUrl: result.coverImageUrl(),
      isProcessingCover: result.isProcessingCover(),
      translations: result.albumTranslations(),
    }

    resolvePreparation(PREPARED_B)
    await pendingSelection

    expect(stateWhileBIsStillPreparing).toEqual({
      coverFallback: originalCoverFallback,
      coverImageUrl: originalCoverImageUrl,
      isProcessingCover: true,
      translations: originalTranslations,
    })
    expect(result.coverPreviewUrl()).toBe('blob:album-cover')
    expect(result.albumTranslations()).toEqual(originalTranslations)
    expect(result.coverFallback()).toBe(originalCoverFallback)
    expect(result.coverImageUrl()).toBe(originalCoverImageUrl)

    await result.handleAlbumSubmit(createSubmitEvent().event)
    expect(storageMocks.writeAlbumDraftCover).toHaveBeenCalledWith(expect.any(String), PREPARED_B)
    expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(PREPARED_B, expect.any(String))
  } finally {
    resolvePreparation(PREPARED_B)
    await pendingSelection
    cleanup()
  }
})
