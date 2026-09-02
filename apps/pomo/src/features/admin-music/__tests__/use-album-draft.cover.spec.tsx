/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useSubmission: vi.fn(() => ({pending: false})),
}))

import {type AlbumDraftData, type AlbumDraftTranslations} from '../album-draft'
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
  albumId: COVER_DRAFT_ID,
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
  Object.defineProperty(input, 'files', {configurable: true, value: {item: () => file}})
  return {
    event: {currentTarget: input, target: input} as unknown as Event & {
      currentTarget: HTMLInputElement
      target: Element
    },
    input,
  }
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
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:album-cover')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(COVER_DRAFT_ID)
})

afterEach(() => vi.restoreAllMocks())

const renderAlbumDraft = () => {
  const setMessage = vi.fn()
  const hook = renderHook(() =>
    useAlbumDraft({refreshCatalog: vi.fn().mockResolvedValue(undefined), setMessage}),
  )
  return {...hook, setMessage}
}

const waitForRestoration = async (result: ReturnType<typeof renderAlbumDraft>['result']) => {
  await waitFor(() => expect(result.isRestoringDraft()).toBe(false))
}

describe('useAlbumDraft cover preparation', () => {
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

    await result.handleCoverChange(createCoverEvent(null).event)

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
