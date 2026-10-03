/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {AlbumDraftData} from 'src/features/admin-music/album-draft'
import {useAlbumDraft} from 'src/features/admin-music/use-album-draft'

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({clear: vi.fn(), pending: false})),
}))

const {storageMocks, storageModule} = vi.hoisted(() => {
  const storageMocks = {
    deleteAlbumDraft: vi.fn(),
    deleteAlbumDraftCover: vi.fn(),
    deleteAlbumDraftReference: vi.fn(),
    deleteExpiredAlbumDraftCovers: vi.fn(),
    readAlbumDraftCover: vi.fn(),
    readAlbumDraftData: vi.fn(),
    writeAlbumDraftCover: vi.fn(),
    writeAlbumDraftData: vi.fn(),
    writeAlbumDraftReference: vi.fn(),
  }

  return {
    storageMocks,
    storageModule: {
      ...storageMocks,
      readAlbumDraftCover: async (id: string) => {
        try {
          return {data: await storageMocks.readAlbumDraftCover(id), success: true as const}
        } catch (error: unknown) {
          return {error, success: false as const}
        }
      },
      readAlbumDraftData: () => {
        try {
          return {data: storageMocks.readAlbumDraftData(), success: true as const}
        } catch (error: unknown) {
          return {error, success: false as const}
        }
      },
    },
  }
})

const coverMocks = vi.hoisted(() => ({
  prepareAlbumCover: vi.fn(),
  validateAlbumCover: vi.fn(),
}))

vi.mock('src/features/admin-music/album-draft-storage', () => storageModule)
vi.mock('src/features/admin-music/cover-image', () => ({
  prepareAlbumCover: coverMocks.prepareAlbumCover,
}))
vi.mock('src/features/admin-music/cover-upload', () => ({
  uploadAlbumCover: vi.fn(),
  validateAlbumCover: coverMocks.validateAlbumCover,
}))

const COVER_DRAFT_ID = '00000000-0000-4000-8000-000000000001'
const PREPARED_COVER = new File(['prepared'], 'cover.webp', {type: 'image/webp'})
const VALID_COVER = new File(['source'], 'source.png', {type: 'image/png'})

const createCoverEvent = (file: File) => {
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', {value: {item: () => file}})
  return {currentTarget: input, target: input} as Event & {
    currentTarget: HTMLInputElement
    target: Element
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  storageMocks.deleteAlbumDraft.mockResolvedValue({success: true})
  storageMocks.deleteAlbumDraftCover.mockResolvedValue({success: true})
  storageMocks.deleteAlbumDraftReference.mockResolvedValue({success: true})
  storageMocks.deleteExpiredAlbumDraftCovers.mockResolvedValue({success: true})
  storageMocks.readAlbumDraftCover.mockResolvedValue(null)
  storageMocks.writeAlbumDraftReference.mockResolvedValue({success: true})
  coverMocks.prepareAlbumCover.mockResolvedValue(PREPARED_COVER)
  coverMocks.validateAlbumCover.mockImplementation(() => undefined)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:album-cover')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(COVER_DRAFT_ID)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should keep cover metadata in session storage after cover blob save fails and translations are edited', async () => {
  let storedDraft: AlbumDraftData = {
    albumId: COVER_DRAFT_ID,
    coverDraftId: null,
    coverFallback: 'lp',
    coverImageUrl: '',
    hasCoverFile: false,
    translations: {
      en: {description: '', title: ''},
      ja: {description: '', title: ''},
      ko: {description: '', title: '초기 제목'},
      'zh-Hans': {description: '', title: ''},
    },
  }
  storageMocks.readAlbumDraftData.mockImplementation(() => storedDraft)
  storageMocks.writeAlbumDraftData.mockImplementation((draft: AlbumDraftData) => {
    storedDraft = draft
    return {success: true}
  })
  storageMocks.writeAlbumDraftCover.mockResolvedValueOnce({
    error: new Error('quota'),
    success: false,
  })

  const {cleanup, result} = renderHook(() =>
    useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
  )
  await waitFor(() => expect(result.isRestoringDraft()).toBe(false))

  await result.handleCoverChange(createCoverEvent(VALID_COVER))
  expect(result.coverPreviewUrl()).toBe('blob:album-cover')

  result.handleTranslationsChange({
    ...storedDraft.translations,
    ko: {description: '', title: '수정된 제목'},
  })
  await waitFor(() => expect(storageMocks.writeAlbumDraftData.mock.calls.length).toBeGreaterThan(0))

  expect(storedDraft).toMatchObject({
    coverDraftId: COVER_DRAFT_ID,
    hasCoverFile: true,
    translations: {ko: {description: '', title: '수정된 제목'}},
  })
  cleanup()
})
