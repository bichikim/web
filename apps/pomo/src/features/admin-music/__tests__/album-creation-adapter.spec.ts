/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {albumCreationServices} from '../album-creation-adapter'
import {type AlbumDraftData, createEmptyAlbumTranslations} from '../album-draft'

const storageMocks = vi.hoisted(() => ({deleteAlbumDraft: vi.fn()}))
const coverMocks = vi.hoisted(() => ({uploadAlbumCover: vi.fn()}))

vi.mock('../album-draft-storage', () => storageMocks)
vi.mock('../cover-upload', () => ({uploadAlbumCover: coverMocks.uploadAlbumCover}))

const ALBUM_ID = '00000000-0000-4000-8000-000000000001'
const COVER_DRAFT_ID = '00000000-0000-4000-8000-000000000002'

const createDraft = (overrides: Partial<AlbumDraftData> = {}): AlbumDraftData => ({
  albumId: ALBUM_ID,
  coverDraftId: COVER_DRAFT_ID,
  coverFallback: 'music',
  coverImageUrl: '  https://example.com/configured.jpg  ',
  hasCoverFile: false,
  translations: {
    ...createEmptyAlbumTranslations(),
    en: {description: '', title: ' English title '},
    ja: {description: ' 日本語の説明 ', title: ''},
    ko: {description: ' 한국어 설명 ', title: ' 한국어 제목 '},
  },
  ...overrides,
})

beforeEach(() => {
  storageMocks.deleteAlbumDraft.mockResolvedValue({success: true})
  coverMocks.uploadAlbumCover.mockResolvedValue({
    coverImageUrl: 'https://cdn.example.com/cover.webp',
    coverReservationId: '00000000-0000-4000-8000-000000000003',
  })
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation(async () =>
      Promise.resolve(
        new Response(JSON.stringify({id: ALBUM_ID}), {
          headers: {'Content-Type': 'application/json'},
          status: 201,
        }),
      ),
    ),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('albumCreationServices', () => {
  it('should normalize configured album fields without uploading a cover', async () => {
    await expect(albumCreationServices.createAlbum(createDraft(), null)).resolves.toEqual({
      albumId: ALBUM_ID,
      success: true,
    })

    expect(coverMocks.uploadAlbumCover).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'music',
        coverImageUrl: 'https://example.com/configured.jpg',
        coverReservationId: null,
        id: ALBUM_ID,
        translations: [
          {description: '한국어 설명', locale: 'ko', title: '한국어 제목'},
          {description: '', locale: 'en', title: 'English title'},
          {description: '日本語の説明', locale: 'ja', title: ''},
        ],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })

  it('should use uploaded cover values and submit null for a blank configured URL', async () => {
    const cover = new File(['cover'], 'cover.webp', {type: 'image/webp'})
    await albumCreationServices.createAlbum(createDraft({coverImageUrl: ''}), cover)

    expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(cover, COVER_DRAFT_ID)
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toMatchObject({
      coverDraftId: COVER_DRAFT_ID,
      coverImageUrl: 'https://cdn.example.com/cover.webp',
      coverReservationId: '00000000-0000-4000-8000-000000000003',
    })

    coverMocks.uploadAlbumCover.mockResolvedValueOnce(null)
    await albumCreationServices.createAlbum(createDraft({coverImageUrl: ''}), cover)
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body))).toMatchObject({
      coverDraftId: null,
      coverImageUrl: null,
      coverReservationId: null,
    })
  })

  it('should reject unsuccessful responses with the actionable message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, {status: 400}))

    await expect(albumCreationServices.createAlbum(createDraft(), null)).rejects.toThrow(
      '저장하지 못했습니다. 입력값과 로그인 상태를 확인해 주세요.',
    )
  })

  it('should return a recoverable result for a creation payload conflict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({error: 'album_creation_payload_mismatch'}, {status: 409}),
    )

    await expect(albumCreationServices.createAlbum(createDraft(), null)).resolves.toEqual({
      code: 'album_creation_payload_mismatch',
      success: false,
    })
  })

  it('should clear the stored draft and convert storage failures to false', async () => {
    await expect(albumCreationServices.clearDraft(COVER_DRAFT_ID)).resolves.toBe(true)
    expect(storageMocks.deleteAlbumDraft).toHaveBeenCalledWith(COVER_DRAFT_ID)

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    storageMocks.deleteAlbumDraft.mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(albumCreationServices.clearDraft(COVER_DRAFT_ID)).resolves.toBe(false)
    expect(warning).toHaveBeenCalledWith(
      'Failed to clear the created album draft.',
      expect.any(Error),
    )
  })
})
