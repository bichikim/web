/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const storageMocks = vi.hoisted(() => ({
  deleteExpiredAlbumDraftCovers: vi.fn(),
  readAlbumDraftCover: vi.fn(),
  readAlbumDraftData: vi.fn(),
  writeAlbumDraftData: vi.fn(),
}))

vi.mock('../album-draft-storage', () => storageMocks)

import {createEmptyAlbumTranslations} from '../album-draft'
import {useAlbumDraft} from '../use-album-draft'

beforeEach(() => {
  vi.resetAllMocks()
  storageMocks.deleteExpiredAlbumDraftCovers.mockResolvedValue({success: true})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAlbumDraft', () => {
  it('should ignore a cover draft restored after disposal', async () => {
    let resolveCover: (file: File | null) => void = () => undefined
    const coverLoad = new Promise<File | null>((resolve) => {
      resolveCover = resolve
    })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:album-cover')
    const setMessage = vi.fn()
    storageMocks.readAlbumDraftData.mockReturnValue({
      coverDraftId: 'cover-draft-id',
      coverFallback: 'lp',
      coverImageUrl: '',
      hasCoverFile: true,
      translations: createEmptyAlbumTranslations(),
    })
    storageMocks.readAlbumDraftCover.mockReturnValue(coverLoad)
    const AlbumDraftHarness = () => {
      useAlbumDraft({refreshCatalog: vi.fn(), setMessage})
      return <div />
    }

    const {unmount} = render(() => <AlbumDraftHarness />)

    await waitFor(() => expect(storageMocks.readAlbumDraftCover).toHaveBeenCalledOnce())
    unmount()
    resolveCover(new File(['cover'], 'cover.webp', {type: 'image/webp'}))
    await coverLoad
    await Promise.resolve()

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(setMessage).not.toHaveBeenCalled()
  })
})
