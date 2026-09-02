/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  type AlbumCreationServices,
  createAlbumSubmitHandler,
  type CreateAlbumSubmitHandlerOptions,
} from '../album-creation'
import {type AlbumDraftData, createEmptyAlbumTranslations} from '../album-draft'

const ALBUM_ID = '00000000-0000-4000-8000-000000000001'
const COVER_DRAFT_ID = '00000000-0000-4000-8000-000000000002'

const createDraft = (): AlbumDraftData => ({
  albumId: ALBUM_ID,
  coverDraftId: COVER_DRAFT_ID,
  coverFallback: 'lp',
  coverImageUrl: '',
  hasCoverFile: false,
  translations: createEmptyAlbumTranslations(),
})

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

const createOptions = () => {
  const services: AlbumCreationServices = {
    clearDraft: vi.fn().mockResolvedValue(true),
    createAlbum: vi.fn().mockResolvedValue({albumId: ALBUM_ID, success: true}),
  }
  const options: CreateAlbumSubmitHandlerOptions = {
    clearPreparedCover: vi.fn(),
    getCoverDraftId: () => COVER_DRAFT_ID,
    getCoverFile: () => null,
    getDraftData: createDraft,
    onAlbumCreated: vi.fn(),
    persistDraft: vi.fn(),
    refreshCatalog: vi.fn().mockResolvedValue(undefined),
    renewAlbumId: vi.fn(),
    services,
    setAlbumId: vi.fn(),
    setCoverDraftId: vi.fn(),
    setCoverFallback: vi.fn(),
    setCoverImageUrl: vi.fn(),
    setIsSavingAlbum: vi.fn(),
    setMessage: vi.fn(),
    setTranslations: vi.fn(),
    waitForDraftPersistence: vi.fn().mockResolvedValue(undefined),
  }
  return {options, services}
}

describe('createAlbumSubmitHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should persist before creating and reset state after all post-create work succeeds', async () => {
    const {options, services} = createOptions()
    const operations: string[] = []
    vi.mocked(options.persistDraft).mockImplementation(() => operations.push('persist'))
    vi.mocked(options.waitForDraftPersistence).mockImplementation(async () => {
      operations.push('wait')
    })
    vi.mocked(services.createAlbum).mockImplementation(async () => {
      operations.push('create')
      return {albumId: ALBUM_ID, success: true}
    })
    const {event, preventDefault, reset} = createSubmitEvent()

    await createAlbumSubmitHandler(options)(event)

    expect(operations).toEqual(['persist', 'wait', 'create'])
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(services.createAlbum).toHaveBeenCalledWith(createDraft(), null)
    expect(services.clearDraft).toHaveBeenCalledWith(COVER_DRAFT_ID)
    expect(reset).toHaveBeenCalledOnce()
    expect(options.clearPreparedCover).toHaveBeenCalledOnce()
    expect(options.refreshCatalog).toHaveBeenCalledOnce()
    expect(options.onAlbumCreated).toHaveBeenCalledWith(ALBUM_ID)
    expect(options.setMessage).toHaveBeenLastCalledWith('앨범 초안을 만들었습니다.')
    expect(options.setIsSavingAlbum).toHaveBeenNthCalledWith(1, true)
    expect(options.setIsSavingAlbum).toHaveBeenLastCalledWith(false)
  })

  it('should retain the form and report an Error when creation fails', async () => {
    const {options, services} = createOptions()
    vi.mocked(services.createAlbum).mockRejectedValue(new Error('response lost'))
    const {event, reset} = createSubmitEvent()

    await createAlbumSubmitHandler(options)(event)

    expect(reset).not.toHaveBeenCalled()
    expect(services.clearDraft).not.toHaveBeenCalled()
    expect(options.refreshCatalog).not.toHaveBeenCalled()
    expect(options.setMessage).toHaveBeenLastCalledWith('response lost')
    expect(options.setIsSavingAlbum).toHaveBeenLastCalledWith(false)
  })

  it('should report the generic message for non-Error creation failures', async () => {
    const {options, services} = createOptions()
    vi.mocked(services.createAlbum).mockRejectedValue('network unavailable')

    await createAlbumSubmitHandler(options)(createSubmitEvent().event)

    expect(options.setMessage).toHaveBeenLastCalledWith('앨범을 저장하지 못했습니다.')
  })

  it.each([
    {
      message:
        '이전 요청에서 앨범이 이미 만들어졌습니다. 현재 입력은 유지하고 새 앨범 ID로 전환했습니다. 목록에서 기존 앨범을 확인한 뒤 필요하면 다시 저장해 주세요.',
      refreshCatalog: true,
    },
    {
      message:
        '이전 요청에서 앨범이 이미 만들어졌지만 목록을 새로고침하지 못했습니다. 현재 입력은 유지하고 새 앨범 ID로 전환했으니 페이지를 새로고침한 뒤 확인해 주세요.',
      refreshCatalog: false,
    },
  ])(
    'should retain the draft with a new creation ID when conflict refresh=$refreshCatalog',
    async ({message, refreshCatalog}) => {
      const {options, services} = createOptions()
      vi.mocked(services.createAlbum).mockResolvedValue({
        code: 'album_creation_payload_mismatch',
        success: false,
      })
      if (!refreshCatalog) {
        vi.mocked(options.refreshCatalog).mockRejectedValue(new Error('network unavailable'))
      }
      const {event, reset} = createSubmitEvent()

      await createAlbumSubmitHandler(options)(event)

      expect(reset).not.toHaveBeenCalled()
      expect(options.renewAlbumId).toHaveBeenCalledOnce()
      expect(options.persistDraft).toHaveBeenCalledTimes(2)
      expect(options.waitForDraftPersistence).toHaveBeenCalledTimes(2)
      expect(options.refreshCatalog).toHaveBeenCalledOnce()
      expect(options.setMessage).toHaveBeenLastCalledWith(message)
      expect(options.setIsSavingAlbum).toHaveBeenLastCalledWith(false)
    },
  )

  it.each([
    {
      clearDraft: false,
      message: '앨범은 만들었지만 브라우저의 작성 초안을 지우지 못했습니다.',
      refreshCatalog: true,
    },
    {
      clearDraft: true,
      message: '앨범은 만들었지만 목록을 새로고침하지 못했습니다.',
      refreshCatalog: false,
    },
    {
      clearDraft: false,
      message:
        '앨범은 만들었지만 목록을 새로고침하지 못했고 브라우저의 작성 초안도 지우지 못했습니다.',
      refreshCatalog: false,
    },
  ])(
    'should preserve the post-create result when clear=$clearDraft and refresh=$refreshCatalog',
    async ({clearDraft, message, refreshCatalog}) => {
      const {options, services} = createOptions()
      vi.mocked(services.clearDraft).mockResolvedValue(clearDraft)
      if (!refreshCatalog) {
        vi.mocked(options.refreshCatalog).mockRejectedValue(new Error('network unavailable'))
      }

      await createAlbumSubmitHandler(options)(createSubmitEvent().event)

      expect(options.onAlbumCreated).toHaveBeenCalledWith(ALBUM_ID)
      expect(options.setMessage).toHaveBeenLastCalledWith(message)
      expect(options.setIsSavingAlbum).toHaveBeenLastCalledWith(false)
    },
  )
})
