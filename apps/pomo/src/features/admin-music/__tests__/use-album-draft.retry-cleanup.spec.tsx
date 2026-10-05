/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({clear: vi.fn(), pending: false})),
}))

const coverMocks = vi.hoisted(() => ({
  prepareAlbumCover: vi.fn(),
  uploadAlbumCover: vi.fn(),
  validateAlbumCover: vi.fn(),
}))

vi.mock('../cover-image', () => ({prepareAlbumCover: coverMocks.prepareAlbumCover}))
vi.mock('../cover-upload', () => ({
  uploadAlbumCover: coverMocks.uploadAlbumCover,
  validateAlbumCover: coverMocks.validateAlbumCover,
}))

import {createEmptyAlbumTranslations} from '../album-draft'
import {
  readAlbumDraftCoverOrNull,
  readAlbumDraftDataOrNull,
  writeAlbumDraftCover,
  writeAlbumDraftData,
} from '../album-draft-storage'
import {useAlbumDraft} from '../use-album-draft'
import {prepareAlbumCover} from '../cover-image'
import {uploadAlbumCover, validateAlbumCover} from '../cover-upload'

const FAILED_COVER = new File(['prepared'], 'cover.webp', {type: 'image/webp'})
const SOURCE_COVER = new File(['source'], 'source.png', {type: 'image/png'})

const createSessionStorage = (): Storage => {
  const values = new Map<string, string>()

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

const replaceSessionStorage = (storage: Storage): void => {
  Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: storage})
}

const createSubmitEvent = (): SubmitEvent & {currentTarget: HTMLFormElement; target: Element} => {
  const form = document.createElement('form')
  return {
    currentTarget: form,
    preventDefault: vi.fn(),
    target: form,
  } as unknown as SubmitEvent & {currentTarget: HTMLFormElement; target: Element}
}

const originalSessionStorage = globalThis.sessionStorage

afterEach(() => {
  replaceSessionStorage(originalSessionStorage)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should clear the actual session draft after a cover storage failure is retried successfully', async () => {
  const otherTabStorage = createSessionStorage()
  const currentTabStorage = createSessionStorage()
  const otherCoverId = 'other-tab-cover'
  const otherTabDraft = {
    albumId: '00000000-0000-4000-8000-000000000012',
    coverDraftId: otherCoverId,
    coverFallback: 'lp' as const,
    coverImageUrl: '',
    hasCoverFile: true,
    translations: {...createEmptyAlbumTranslations(), ko: {description: '', title: '다른 탭 초안'}},
  }
  const initialDraft = {
    albumId: '00000000-0000-4000-8000-000000000013',
    coverDraftId: null,
    coverFallback: 'lp' as const,
    coverImageUrl: '',
    hasCoverFile: false,
    translations: createEmptyAlbumTranslations(),
  }
  let cleanupOtherTab: (() => void) | null = null
  let cleanupCurrentTab: (() => void) | null = null

  try {
    await writeAlbumDraftCover(
      otherCoverId,
      new File(['other'], 'other.webp', {type: 'image/webp'}),
    )
    replaceSessionStorage(otherTabStorage)
    expect(writeAlbumDraftData(otherTabDraft)).toEqual({success: true})
    const otherTab = renderHook(() =>
      useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
    )
    cleanupOtherTab = otherTab.cleanup
    await waitFor(() => expect(otherTab.result.isRestoringDraft()).toBe(false))

    replaceSessionStorage(currentTabStorage)
    expect(writeAlbumDraftData(initialDraft)).toEqual({success: true})
    const currentTab = renderHook(() =>
      useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
    )
    cleanupCurrentTab = currentTab.cleanup
    await waitFor(() => expect(currentTab.result.isRestoringDraft()).toBe(false))

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:failed-cover')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.mocked(prepareAlbumCover).mockResolvedValue(FAILED_COVER)
    vi.mocked(validateAlbumCover).mockImplementation(() => undefined)
    vi.mocked(uploadAlbumCover).mockResolvedValue({
      coverImageUrl: 'https://cdn.example.com/cover.webp',
      coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
    })

    const coverWrite = vi.spyOn(await import('../album-draft-storage'), 'writeAlbumDraftCover')
    coverWrite.mockResolvedValueOnce({error: new Error('quota'), success: false})

    const input = document.createElement('input')
    Object.defineProperty(input, 'files', {configurable: true, value: {item: () => SOURCE_COVER}})
    await currentTab.result.handleCoverChange({
      currentTarget: input,
      target: input,
    } as unknown as Event & {currentTarget: HTMLInputElement; target: Element})

    const translations = {
      ...createEmptyAlbumTranslations(),
      ko: {description: '', title: '재시도할 제목'},
    }
    currentTab.result.handleTranslationsChange(translations)
    await waitFor(() =>
      expect(readAlbumDraftDataOrNull()).toMatchObject({
        coverDraftId: null,
        hasCoverFile: false,
        translations,
      }),
    )

    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({error: 'server error'}), {status: 500}))
      .mockResolvedValueOnce(new Response(JSON.stringify({id: 'created-album'}), {status: 201}))
    vi.stubGlobal('fetch', request)

    await currentTab.result.handleAlbumSubmit(createSubmitEvent())
    expect(request).toHaveBeenCalledOnce()
    await currentTab.result.handleAlbumSubmit(createSubmitEvent())

    expect(request).toHaveBeenCalledTimes(2)
    expect(readAlbumDraftDataOrNull()).toBeNull()
    await expect(readAlbumDraftCoverOrNull(otherCoverId)).resolves.not.toBeNull()

    currentTab.cleanup()
    cleanupCurrentTab = null
    const reopenedTab = renderHook(() =>
      useAlbumDraft({refreshCatalog: async () => undefined, setMessage: vi.fn()}),
    )
    try {
      await waitFor(() => expect(reopenedTab.result.isRestoringDraft()).toBe(false))
      expect(reopenedTab.result.albumTranslations().ko.title).toBe('')
      expect(reopenedTab.result.coverPreviewUrl()).toBeNull()
    } finally {
      reopenedTab.cleanup()
    }

    replaceSessionStorage(otherTabStorage)
    expect(readAlbumDraftDataOrNull()).toEqual(otherTabDraft)
  } finally {
    cleanupCurrentTab?.()
    cleanupOtherTab?.()
    replaceSessionStorage(originalSessionStorage)
  }
})
