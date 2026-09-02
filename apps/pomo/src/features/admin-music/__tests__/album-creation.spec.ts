/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createEmptyAlbumTranslations} from '../album-draft'

const coverMocks = vi.hoisted(() => ({uploadAlbumCover: vi.fn()}))

vi.mock('../cover-upload', () => coverMocks)

import {createAlbum} from '../album-creation'

const createDraft = () => ({
  coverDraftId: 'cover-draft',
  coverFallback: 'lp' as const,
  coverImageUrl: ' https://images.example/fallback.webp ',
  hasCoverFile: true,
  translations: {
    ...createEmptyAlbumTranslations(),
    en: {description: ' English description ', title: ' English title '},
    ja: {description: '', title: ''},
    ko: {description: ' 한국어 설명 ', title: ' 한국어 제목 '},
  },
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({id: 'album-one'})))
  coverMocks.uploadAlbumCover.mockResolvedValue({
    coverImageUrl: 'https://storage.example/uploaded.webp',
    coverReservationId: 'reservation-one',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createAlbum', () => {
  it('should upload a prepared cover and create a normalized album', async () => {
    const cover = new File(['cover'], 'cover.webp', {type: 'image/webp'})

    await expect(createAlbum(createDraft(), cover)).resolves.toBe('album-one')

    expect(coverMocks.uploadAlbumCover).toHaveBeenCalledWith(cover, 'cover-draft')
    expect(fetch).toHaveBeenCalledWith('/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: 'cover-draft',
        coverFallback: 'lp',
        coverImageUrl: 'https://storage.example/uploaded.webp',
        coverReservationId: 'reservation-one',
        translations: [
          {description: '한국어 설명', locale: 'ko', title: '한국어 제목'},
          {description: 'English description', locale: 'en', title: 'English title'},
        ],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
  })

  it('should create an album without uploading when no cover file is present', async () => {
    const draft = {...createDraft(), coverDraftId: null, coverImageUrl: '', hasCoverFile: false}

    await createAlbum(draft, null)

    expect(coverMocks.uploadAlbumCover).not.toHaveBeenCalled()
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toMatchObject({
      coverDraftId: null,
      coverImageUrl: null,
      coverReservationId: null,
    })
  })

  it('should reject an unsuccessful or malformed album response', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, {status: 400}))
      .mockResolvedValueOnce(Response.json({id: 42}))

    await expect(createAlbum(createDraft(), null)).rejects.toThrow('저장하지 못했습니다')
    await expect(createAlbum(createDraft(), null)).rejects.toThrow()
  })
})
