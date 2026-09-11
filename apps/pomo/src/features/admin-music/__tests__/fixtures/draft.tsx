import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({clear: vi.fn(), pending: false})),
}))

import {type AlbumDraftData, type AlbumDraftTranslations} from '../../album-draft'
import {useAlbumDraft} from '../../use-album-draft'

const storageMocks = vi.hoisted(() => ({
  deleteAlbumDraft: vi.fn(),
  deleteAlbumDraftCover: vi.fn(),
  deleteAlbumDraftReference: vi.fn(),
  deleteExpiredAlbumDraftCovers: vi.fn(),
  readAlbumDraftCover: vi.fn(),
  readAlbumDraftData: vi.fn(),
  writeAlbumDraftCover: vi.fn(),
  writeAlbumDraftData: vi.fn(),
  writeAlbumDraftReference: vi.fn(),
}))
const coverMocks = vi.hoisted(() => ({
  prepareAlbumCover: vi.fn(),
  uploadAlbumCover: vi.fn(),
  validateAlbumCover: vi.fn(),
}))

vi.mock('../../album-draft-storage', () => storageMocks)
vi.mock('../../cover-image', () => ({prepareAlbumCover: coverMocks.prepareAlbumCover}))
vi.mock('../../cover-upload', () => ({
  uploadAlbumCover: coverMocks.uploadAlbumCover,
  validateAlbumCover: coverMocks.validateAlbumCover,
}))

export {coverMocks, storageMocks}

export const VALID_COVER = new File(['source'], 'source.png', {type: 'image/png'})
export const PREPARED_COVER = new File(['prepared'], 'cover.webp', {type: 'image/webp'})
export const COVER_DRAFT_ID = '00000000-0000-4000-8000-000000000001'
export const RENEWED_ALBUM_ID = '00000000-0000-4000-8000-000000000002'

export const createTranslations = (): AlbumDraftTranslations => ({
  en: {description: '', title: ''},
  ja: {description: '', title: ''},
  ko: {description: ' 한국어 설명 ', title: ' 한국어 제목 '},
  'zh-Hans': {description: '', title: ''},
})

export const createDraft = (overrides: Partial<AlbumDraftData> = {}): AlbumDraftData => ({
  albumId: COVER_DRAFT_ID,
  coverDraftId: null,
  coverFallback: 'lp',
  coverImageUrl: '',
  hasCoverFile: false,
  translations: createTranslations(),
  ...overrides,
})

export const createCoverEvent = (file: File | null) => {
  const input = document.createElement('input')
  input.value = file === null ? '' : 'selected-cover'
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: {item: () => file},
  })
  return {
    event: {currentTarget: input, target: input} as unknown as Event & {
      currentTarget: HTMLInputElement
      target: Element
    },
    input,
  }
}

export const createSubmitEvent = () => {
  const form = document.createElement('form')
  const reset = vi.spyOn(form, 'reset').mockImplementation(() => undefined)
  const preventDefault = vi.fn()
  const event = {currentTarget: form, preventDefault, target: form} as unknown as SubmitEvent & {
    currentTarget: HTMLFormElement
    target: Element
  }
  return {event, preventDefault, reset}
}

export const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.resetAllMocks()
  storageMocks.deleteAlbumDraft.mockResolvedValue({success: true})
  storageMocks.deleteAlbumDraftCover.mockResolvedValue({success: true})
  storageMocks.deleteAlbumDraftReference.mockResolvedValue({success: true})
  storageMocks.deleteExpiredAlbumDraftCovers.mockResolvedValue({success: true})
  storageMocks.readAlbumDraftCover.mockResolvedValue(null)
  storageMocks.readAlbumDraftData.mockReturnValue(null)
  storageMocks.writeAlbumDraftCover.mockResolvedValue({success: true})
  storageMocks.writeAlbumDraftReference.mockResolvedValue({success: true})
  storageMocks.writeAlbumDraftData.mockReturnValue({success: true})
  coverMocks.prepareAlbumCover.mockResolvedValue(PREPARED_COVER)
  coverMocks.uploadAlbumCover.mockResolvedValue({
    coverImageUrl: 'https://cdn.example.com/cover.webp',
    coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:album-cover')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(COVER_DRAFT_ID)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({id: 'album-1'}), {
        headers: {'Content-Type': 'application/json'},
        status: 201,
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

export const renderAlbumDraft = (
  overrides: {
    readonly onAlbumCreated?: (albumId: string) => void
    readonly refreshCatalog?: () => Promise<void>
  } = {},
) => {
  const setMessage = vi.fn()
  const refreshCatalog = overrides.refreshCatalog ?? vi.fn().mockResolvedValue(undefined)
  const hook = renderHook(() =>
    useAlbumDraft({
      ...(overrides.onAlbumCreated === undefined ? {} : {onAlbumCreated: overrides.onAlbumCreated}),
      refreshCatalog,
      setMessage,
    }),
  )
  return {...hook, refreshCatalog, setMessage}
}

export const waitForRestoration = async (result: ReturnType<typeof renderAlbumDraft>['result']) => {
  await waitFor(() => expect(result.isRestoringDraft()).toBe(false))
}
