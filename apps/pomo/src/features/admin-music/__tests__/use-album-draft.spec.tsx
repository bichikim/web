/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type AlbumDraftData,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from '../album-draft'
import {useAlbumDraft} from '../use-album-draft'

const storageMocks = vi.hoisted(() => ({
  deleteAlbumDraft: vi.fn(),
  deleteAlbumDraftCover: vi.fn(),
  deleteExpiredAlbumDraftCovers: vi.fn(),
  readAlbumDraftCover: vi.fn(),
  readAlbumDraftData: vi.fn(),
  writeAlbumDraftCover: vi.fn(),
  writeAlbumDraftData: vi.fn(),
}))
const coverMocks = vi.hoisted(() => ({
  prepareAlbumCover: vi.fn(),
  uploadAlbumCover: vi.fn(),
  validateAlbumCover: vi.fn(),
}))

vi.mock('../album-draft-storage', () => storageMocks)
vi.mock('../cover-image', () => ({prepareAlbumCover: coverMocks.prepareAlbumCover}))
vi.mock('../cover-upload', () => ({
  uploadAlbumCover: coverMocks.uploadAlbumCover,
  validateAlbumCover: coverMocks.validateAlbumCover,
}))

const VALID_COVER = new File(['source'], 'source.png', {type: 'image/png'})
const PREPARED_COVER = new File(['prepared'], 'cover.webp', {type: 'image/webp'})
const COVER_DRAFT_ID = '00000000-0000-4000-8000-000000000001'

const createTranslations = (): AlbumDraftTranslations => ({
  en: {description: '', title: ''},
  ja: {description: '', title: ''},
  ko: {description: ' 한국어 설명 ', title: ' 한국어 제목 '},
  'zh-Hans': {description: '', title: ''},
})

const createDraft = (overrides: Partial<AlbumDraftData> = {}): AlbumDraftData => ({
  coverDraftId: null,
  coverFallback: 'lp',
  coverImageUrl: '',
  hasCoverFile: false,
  translations: createTranslations(),
  ...overrides,
})

const createCoverEvent = (file: File | null) => {
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

const createSubmitEvent = () => {
  const form = document.createElement('form')
  const reset = vi.spyOn(form, 'reset').mockImplementation(() => undefined)
  const preventDefault = vi.fn()
  const event = {currentTarget: form, preventDefault, target: form} as unknown as SubmitEvent & {
    currentTarget: HTMLFormElement
    target: Element
  }
  return {event, preventDefault, reset}
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  vi.resetAllMocks()
  storageMocks.deleteAlbumDraft.mockResolvedValue({success: true})
  storageMocks.deleteAlbumDraftCover.mockResolvedValue({success: true})
  storageMocks.deleteExpiredAlbumDraftCovers.mockResolvedValue({success: true})
  storageMocks.readAlbumDraftCover.mockResolvedValue(null)
  storageMocks.readAlbumDraftData.mockReturnValue(null)
  storageMocks.writeAlbumDraftCover.mockResolvedValue({success: true})
  storageMocks.writeAlbumDraftData.mockReturnValue({success: true})
  coverMocks.prepareAlbumCover.mockResolvedValue(PREPARED_COVER)
  coverMocks.uploadAlbumCover.mockResolvedValue('https://cdn.example.com/cover.webp')
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:album-cover')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(COVER_DRAFT_ID)
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({id: 'album-1'}), {
        headers: {'Content-Type': 'application/json'},
        status: 200,
      }),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const renderAlbumDraft = (
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

const waitForRestoration = async (result: ReturnType<typeof renderAlbumDraft>['result']) => {
  await waitFor(() => expect(result.isRestoringDraft()).toBe(false))
}

describe('album draft restoration', () => {
  it('should finish without a restoration message when no draft exists', async () => {
    const {cleanup, result, setMessage} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledWith({
      activeCoverDraftId: null,
    })
    expect(setMessage).not.toHaveBeenCalled()
    cleanup()
  })

  it('should restore draft fields without a prepared cover', async () => {
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverFallback: 'cd', coverImageUrl: 'https://example.com/cover.jpg'}),
    )
    const {cleanup, result, setMessage} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(result.coverFallback()).toBe('cd')
    expect(result.coverImageUrl()).toBe('https://example.com/cover.jpg')
    expect(result.albumTranslations()).toEqual(createTranslations())
    expect(result.coverPreviewUrl()).toBeNull()
    expect(setMessage).toHaveBeenCalledWith('작성 중이던 앨범 초안을 복원했습니다.')
    cleanup()
  })

  it('should preserve field edits made while draft restoration is pending', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    const editedTranslations: AlbumDraftTranslations = {
      ...createEmptyAlbumTranslations(),
      ko: {description: '', title: '새 제목'},
    }
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverFallback: 'cd', coverImageUrl: 'https://saved.example/old.webp'}),
    )
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, result, setMessage} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    result.handleTranslationsChange(editedTranslations)
    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://new.example/current.webp'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    result.handleCoverFallbackChange({
      currentTarget: {value: 'music'},
    } as unknown as Event & {currentTarget: HTMLSelectElement})
    resolveCleanup({success: true})
    await waitForRestoration(result)

    expect(result.albumTranslations()).toBe(editedTranslations)
    expect(result.coverImageUrl()).toBe('https://new.example/current.webp')
    expect(result.coverFallback()).toBe('music')
    await waitFor(() => {
      expect(storageMocks.writeAlbumDraftData).toHaveBeenLastCalledWith({
        coverDraftId: null,
        coverFallback: 'music',
        coverImageUrl: 'https://new.example/current.webp',
        hasCoverFile: false,
        translations: editedTranslations,
      })
    })
    await result.handleAlbumSubmit(createSubmitEvent().event)
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      coverFallback: 'music',
      coverImageUrl: 'https://new.example/current.webp',
      translations: [{description: '', locale: 'ko', title: '새 제목'}],
    })
    cleanup()
  })

  it('should defer partial field persistence until draft restoration finishes', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    const storedDraft = createDraft({
      coverFallback: 'cd',
      coverImageUrl: 'https://saved.example/old.webp',
    })
    storageMocks.readAlbumDraftData.mockReturnValue(storedDraft)
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, result, setMessage} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://new.example/current.webp'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
    resolveCleanup({success: true})
    await waitForRestoration(result)
    await waitFor(() =>
      expect(storageMocks.writeAlbumDraftData).toHaveBeenLastCalledWith({
        ...storedDraft,
        coverImageUrl: 'https://new.example/current.webp',
      }),
    )
    cleanup()
  })

  it('should persist deferred field edits when no stored draft exists', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, result} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://new.example/current.webp'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()

    resolveCleanup({success: true})
    await waitForRestoration(result)
    await waitFor(() =>
      expect(storageMocks.writeAlbumDraftData).toHaveBeenLastCalledWith(
        expect.objectContaining({coverImageUrl: 'https://new.example/current.webp'}),
      ),
    )
    cleanup()
  })

  it('should preserve a prepared cover selected while draft restoration is pending', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    const storedCover = new File(['stored'], 'stored.webp', {type: 'image/webp'})
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    storageMocks.readAlbumDraftCover.mockResolvedValue(storedCover)
    const {cleanup, result} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    const coverChange = result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    await waitFor(() => expect(coverMocks.prepareAlbumCover).toHaveBeenCalledOnce())
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()
    expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
    resolveCleanup({success: true})
    await coverChange
    await waitForRestoration(result)

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).toHaveBeenCalledWith(PREPARED_COVER)
    await result.handleAlbumSubmit(createSubmitEvent().event)
    expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(PREPARED_COVER, COVER_DRAFT_ID)
    cleanup()
  })

  it('should normalize a cover flag that has no cover identifier', async () => {
    const draft = createDraft({hasCoverFile: true})
    storageMocks.readAlbumDraftData.mockReturnValue(draft)
    const {cleanup, result} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith({
      ...draft,
      hasCoverFile: false,
    })
    expect(result.coverPreviewUrl()).toBeNull()
    cleanup()
  })

  it('should restore a persisted cover and revoke its preview during cleanup', async () => {
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.readAlbumDraftCover.mockResolvedValue(PREPARED_COVER)
    const {cleanup, result} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(result.coverPreviewUrl()).toBe('blob:album-cover')
    expect(URL.createObjectURL).toHaveBeenCalledWith(PREPARED_COVER)
    cleanup()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:album-cover')
  })

  it('should normalize draft data when its persisted cover is missing', async () => {
    const draft = createDraft({coverDraftId: 'missing-cover', hasCoverFile: true})
    storageMocks.readAlbumDraftData.mockReturnValue(draft)
    const {cleanup, result} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith({
      ...draft,
      coverDraftId: null,
      hasCoverFile: false,
    })
    cleanup()
  })

  it('should report restoration failures while the hook remains mounted', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    storageMocks.readAlbumDraftData.mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const {cleanup, result, setMessage} = renderAlbumDraft()

    await waitForRestoration(result)

    expect(warning).toHaveBeenCalledWith(
      'Failed to restore the admin album draft.',
      expect.any(Error),
    )
    expect(setMessage).toHaveBeenCalledWith(
      '브라우저 초안을 복원하지 못했습니다. 새로 입력한 내용은 이 탭에 유지됩니다.',
    )
    cleanup()
  })

  it('should ignore a cover draft restored after disposal', async () => {
    let resolveCover: (file: File | null) => void = () => undefined
    const coverLoad = new Promise<File | null>((resolve) => {
      resolveCover = resolve
    })
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.readAlbumDraftCover.mockReturnValue(coverLoad)
    const {cleanup, setMessage} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.readAlbumDraftCover).toHaveBeenCalledOnce())
    cleanup()
    resolveCover(PREPARED_COVER)
    await coverLoad
    await flushPromises()

    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(setMessage).not.toHaveBeenCalled()
  })

  it('should suppress restoration errors after disposal', async () => {
    let rejectCleanup: (error: Error) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((_resolve, reject) => {
      rejectCleanup = reject
    })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, setMessage} = renderAlbumDraft()

    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())
    cleanup()
    rejectCleanup(new Error('cleanup unavailable'))
    await flushPromises()

    expect(warning).not.toHaveBeenCalled()
    expect(setMessage).not.toHaveBeenCalled()
  })
})

describe('draft field persistence', () => {
  it('should persist valid fallback, image URL, and translations while ignoring invalid fallback', async () => {
    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)
    const translations = createEmptyAlbumTranslations()

    result.handleCoverFallbackChange({
      currentTarget: {value: 'cd'},
    } as unknown as Event & {currentTarget: HTMLSelectElement})
    await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce())
    result.handleCoverFallbackChange({
      currentTarget: {value: 'invalid'},
    } as unknown as Event & {currentTarget: HTMLSelectElement})
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce()
    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://example.com/configured.jpg'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledTimes(2))
    result.handleTranslationsChange(translations)
    await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledTimes(3))

    expect(result.coverFallback()).toBe('cd')
    expect(result.coverImageUrl()).toBe('https://example.com/configured.jpg')
    expect(result.albumTranslations()).toBe(translations)
    cleanup()
  })

  it('should report data write failures from field persistence', async () => {
    storageMocks.writeAlbumDraftData.mockReturnValue({error: 'quota', success: false})
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://example.com/configured.jpg'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})

    await waitFor(() =>
      expect(setMessage).toHaveBeenCalledWith(
        '브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.',
      ),
    )
    cleanup()
  })

  it('should report exceptions raised while loading field persistence', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    storageMocks.writeAlbumDraftData.mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    result.handleTranslationsChange(createEmptyAlbumTranslations())

    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith(
        'Failed to load the album draft storage.',
        expect.any(Error),
      ),
    )
    expect(setMessage).toHaveBeenCalledWith(
      '브라우저 초안 저장 기능을 불러오지 못했습니다. 이 탭을 닫지 마세요.',
    )
    cleanup()
  })
})

describe('cover preparation', () => {
  it('should ignore a deferred clear superseded by a new cover selection', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, result} = renderAlbumDraft()
    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())

    const pendingClear = result.handleCoverChange(createCoverEvent(null).event)
    const pendingSelection = result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    await waitFor(() => expect(coverMocks.prepareAlbumCover).toHaveBeenCalledOnce())
    resolveCleanup({success: true})
    await Promise.all([pendingClear, pendingSelection])

    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce()
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith(
      expect.objectContaining({coverDraftId: COVER_DRAFT_ID, hasCoverFile: true}),
    )
    cleanup()
  })

  it('should ignore a prepared cover waiting for restoration after disposal', async () => {
    let resolveCleanup: (result: {success: true}) => void = () => undefined
    const cleanupLoad = new Promise<{success: true}>((resolve) => {
      resolveCleanup = resolve
    })
    storageMocks.deleteExpiredAlbumDraftCovers.mockReturnValue(cleanupLoad)
    const {cleanup, result} = renderAlbumDraft()
    await waitFor(() => expect(storageMocks.deleteExpiredAlbumDraftCovers).toHaveBeenCalledOnce())

    const pendingSelection = result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    await waitFor(() => expect(coverMocks.prepareAlbumCover).toHaveBeenCalledOnce())
    cleanup()
    await pendingSelection

    expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()
    expect(storageMocks.writeAlbumDraftData).not.toHaveBeenCalled()
    resolveCleanup({success: true})
    await cleanupLoad
    await flushPromises()
  })

  it('should clear an empty cover selection and delete its previous stored cover', async () => {
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.readAlbumDraftCover.mockResolvedValue(PREPARED_COVER)
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)
    const {event} = createCoverEvent(null)

    await result.handleCoverChange(event)

    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith(
      expect.objectContaining({coverDraftId: null, hasCoverFile: false}),
    )
    expect(storageMocks.deleteAlbumDraftCover).toHaveBeenCalledWith('stored-cover')
    expect(setMessage).toHaveBeenLastCalledWith(null)
    expect(result.coverPreviewUrl()).toBeNull()
    cleanup()
  })

  it('should report when clearing a cover cannot update draft data', async () => {
    storageMocks.writeAlbumDraftData.mockReturnValue({error: 'quota', success: false})
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleCoverChange(createCoverEvent(null).event)

    expect(setMessage).toHaveBeenLastCalledWith(
      '커버는 화면에서 지웠지만 브라우저 초안을 갱신하지 못했습니다. 이 탭을 닫기 전에 다시 시도해 주세요.',
    )
    expect(storageMocks.deleteAlbumDraftCover).not.toHaveBeenCalled()
    cleanup()
  })

  it('should prepare and persist a new cover', async () => {
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

    expect(coverMocks.validateAlbumCover).toHaveBeenCalledWith(VALID_COVER)
    expect(coverMocks.prepareAlbumCover).toHaveBeenCalledWith(VALID_COVER)
    expect(storageMocks.writeAlbumDraftCover).toHaveBeenCalledWith(COVER_DRAFT_ID, PREPARED_COVER)
    expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledWith(
      expect.objectContaining({coverDraftId: COVER_DRAFT_ID, hasCoverFile: true}),
    )
    expect(result.coverPreviewUrl()).toBe('blob:album-cover')
    expect(result.isProcessingCover()).toBe(false)
    expect(setMessage).toHaveBeenLastCalledWith(
      '커버를 중앙 정사각형으로 자르고 1200×1200 WebP로 준비했습니다.',
    )
    cleanup()
  })

  it('should report cover blob and draft data persistence failures', async () => {
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)
    storageMocks.writeAlbumDraftCover.mockResolvedValueOnce({error: 'quota', success: false})

    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    expect(setMessage).toHaveBeenLastCalledWith(
      '커버는 준비했지만 브라우저에 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.',
    )

    storageMocks.writeAlbumDraftCover.mockResolvedValue({success: true})
    storageMocks.writeAlbumDraftData.mockReturnValue({error: 'quota', success: false})
    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

    expect(storageMocks.deleteAlbumDraftCover).toHaveBeenCalledWith(COVER_DRAFT_ID)
    expect(setMessage).toHaveBeenLastCalledWith(
      '커버는 준비했지만 브라우저에 초안을 저장하지 못했습니다. 이 탭을 닫기 전에 앨범을 만들어 주세요.',
    )
    cleanup()
  })

  it('should replace the previous cover preview and stored blob', async () => {
    storageMocks.readAlbumDraftData.mockReturnValue(
      createDraft({coverDraftId: 'stored-cover', hasCoverFile: true}),
    )
    storageMocks.readAlbumDraftCover.mockResolvedValue(PREPARED_COVER)
    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:album-cover')
    expect(storageMocks.deleteAlbumDraftCover).toHaveBeenCalledWith('stored-cover')
    cleanup()
  })

  it('should clear invalid selections and distinguish unknown preparation failures', async () => {
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)
    const invalidSelection = createCoverEvent(VALID_COVER)
    coverMocks.validateAlbumCover.mockImplementationOnce(() => {
      throw new Error('잘못된 이미지')
    })

    await result.handleCoverChange(invalidSelection.event)

    expect(invalidSelection.input.value).toBe('')
    expect(setMessage).toHaveBeenLastCalledWith('잘못된 이미지')

    const unknownFailure = createCoverEvent(VALID_COVER)
    coverMocks.prepareAlbumCover.mockRejectedValueOnce('decode failed')
    await result.handleCoverChange(unknownFailure.event)

    expect(unknownFailure.input.value).toBe('')
    expect(setMessage).toHaveBeenLastCalledWith('커버 이미지를 선택하지 못했습니다.')
    expect(result.isProcessingCover()).toBe(false)
    cleanup()
  })

  it('should ignore preparation that finishes after the selection is cleared', async () => {
    let resolvePreparation: (file: File) => void = () => undefined
    const preparation = new Promise<File>((resolve) => {
      resolvePreparation = resolve
    })
    coverMocks.prepareAlbumCover.mockReturnValue(preparation)
    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)

    const pendingChange = result.handleCoverChange(createCoverEvent(VALID_COVER).event)
    await waitFor(() => expect(result.isProcessingCover()).toBe(true))
    await result.handleCoverChange(createCoverEvent(null).event)
    resolvePreparation(PREPARED_COVER)
    await pendingChange

    expect(storageMocks.writeAlbumDraftCover).not.toHaveBeenCalled()
    expect(result.coverPreviewUrl()).toBeNull()
    expect(result.isProcessingCover()).toBe(false)
    cleanup()
  })
})

describe('album creation', () => {
  it('should finish pending field persistence before deleting a created album draft', async () => {
    const operations: string[] = []
    storageMocks.writeAlbumDraftData.mockImplementation(() => {
      operations.push('write')
      return {success: true}
    })
    const {cleanup, result, setMessage} = renderAlbumDraft()
    setMessage.mockImplementation((message) => {
      if (message === '앨범 초안을 만들었습니다.') {
        operations.push('created')
      }
    })
    await waitForRestoration(result)

    result.handleCoverImageUrlInput({
      currentTarget: {value: 'https://example.com/current.webp'},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    await result.handleAlbumSubmit(createSubmitEvent().event)
    await waitFor(() => expect(storageMocks.writeAlbumDraftData).toHaveBeenCalledOnce())
    await waitFor(() => expect(setMessage).toHaveBeenLastCalledWith('앨범 초안을 만들었습니다.'))

    expect(fetch).toHaveBeenCalledOnce()
    expect(operations).toEqual(['write', 'created'])
    cleanup()
  })

  it('should create an album, clear its draft, refresh, and notify its callback', async () => {
    const onAlbumCreated = vi.fn()
    const {cleanup, refreshCatalog, result, setMessage} = renderAlbumDraft({onAlbumCreated})
    await waitForRestoration(result)
    result.handleCoverImageUrlInput({
      currentTarget: {value: '  https://example.com/configured.jpg  '},
    } as unknown as InputEvent & {currentTarget: HTMLInputElement})
    result.handleCoverFallbackChange({
      currentTarget: {value: 'music'},
    } as unknown as Event & {currentTarget: HTMLSelectElement})
    result.handleTranslationsChange({
      en: {description: '', title: ' English title '},
      ja: {description: ' 日本語の説明 ', title: ''},
      ko: {description: ' 한국어 설명 ', title: ' 한국어 제목 '},
      'zh-Hans': {description: '', title: ''},
    })
    await flushPromises()
    const {event, preventDefault, reset} = createSubmitEvent()

    await result.handleAlbumSubmit(event)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(reset).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/admin/music/albums', {
      body: JSON.stringify({
        coverFallback: 'music',
        coverImageUrl: 'https://example.com/configured.jpg',
        translations: [
          {description: '한국어 설명', locale: 'ko', title: '한국어 제목'},
          {description: '', locale: 'en', title: 'English title'},
          {description: '日本語の説明', locale: 'ja', title: ''},
        ],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
    expect(refreshCatalog).toHaveBeenCalledOnce()
    expect(onAlbumCreated).toHaveBeenCalledWith('album-1')
    expect(setMessage).toHaveBeenLastCalledWith('앨범 초안을 만들었습니다.')
    expect(result.isSavingAlbum()).toBe(false)
    expect(result.coverFallback()).toBe('lp')
    cleanup()
  })

  it('should upload a prepared cover and preserve the deletion warning', async () => {
    storageMocks.deleteAlbumDraft.mockResolvedValue({error: 'quota', success: false})
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)
    await result.handleCoverChange(createCoverEvent(VALID_COVER).event)

    await result.handleAlbumSubmit(createSubmitEvent().event)

    expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(PREPARED_COVER, COVER_DRAFT_ID)
    expect(setMessage).toHaveBeenLastCalledWith(
      '앨범은 만들었지만 브라우저의 작성 초안을 지우지 못했습니다.',
    )
    cleanup()
  })

  it('should report catalog refresh failures without invoking an absent callback', async () => {
    const refreshCatalog = vi.fn().mockRejectedValue(new Error('network unavailable'))
    const {cleanup, result, setMessage} = renderAlbumDraft({refreshCatalog})
    await waitForRestoration(result)

    await result.handleAlbumSubmit(createSubmitEvent().event)

    expect(setMessage).toHaveBeenLastCalledWith('앨범은 만들었지만 목록을 새로고침하지 못했습니다.')
    cleanup()
  })

  it('should report rejected album responses and retain the form', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, {status: 400}))
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)
    const {event, reset} = createSubmitEvent()

    await result.handleAlbumSubmit(event)

    expect(reset).not.toHaveBeenCalled()
    expect(setMessage).toHaveBeenLastCalledWith(
      '저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.',
    )
    expect(result.isSavingAlbum()).toBe(false)
    cleanup()
  })

  it('should report non-error failures with the generic album message', async () => {
    vi.mocked(fetch).mockRejectedValueOnce('network unavailable')
    const {cleanup, result, setMessage} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleAlbumSubmit(createSubmitEvent().event)

    expect(setMessage).toHaveBeenLastCalledWith('앨범을 저장하지 못했습니다.')
    cleanup()
  })

  it('should submit a null cover URL when the configured URL is blank', async () => {
    const {cleanup, result} = renderAlbumDraft()
    await waitForRestoration(result)

    await result.handleAlbumSubmit(createSubmitEvent().event)

    const request = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toMatchObject({coverImageUrl: null})
    cleanup()
  })
})
