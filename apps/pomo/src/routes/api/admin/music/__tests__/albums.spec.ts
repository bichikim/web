import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({createAlbum: vi.fn()}))
const storageMocks = vi.hoisted(() => ({isManagedAlbumCoverUrl: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)
vi.mock('src/server/music/cover-upload', () => storageMocks)

import {POST} from '../albums'
import {invokeApiRoute} from '../../../__tests__/invoke'

const ALBUM_ID = '00000000-0000-4000-8000-000000000002'

const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/admin/music/albums', {
    body: JSON.stringify({
      coverDraftId: null,
      coverFallback: 'lp',
      coverImageUrl: null,
      coverReservationId: null,
      id: ALBUM_ID,
      translations: [
        {description: '첫 유료 앨범', locale: 'ko', title: '테스트 앨범'},
        {description: 'The first paid album', locale: 'en', title: 'Test Album'},
        {description: '初の有料アルバム', locale: 'ja', title: 'テストアルバム'},
        {description: '首张付费专辑', locale: 'zh-Hans', title: '测试专辑'},
      ],
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('admin music album route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({
      authorized: true,
      cookies: [],
    })
    repositoryMocks.createAlbum.mockReset().mockResolvedValue({
      album: {
        coverFallback: 'lp',
        coverImageUrl: null,
        id: 'album-id',
        status: 'draft',
        translations: [],
      },
      success: true,
    })
    storageMocks.isManagedAlbumCoverUrl.mockReset().mockReturnValue(false)
  })

  it('should reject a request before writing when the API session is not admin', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(403)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should create a draft album for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(201)
    expect(repositoryMocks.createAlbum).toHaveBeenCalledWith({
      coverDraftId: null,
      coverFallback: 'lp',
      coverImageUrl: null,
      coverReservationId: null,
      id: ALBUM_ID,
      translations: [
        {description: '첫 유료 앨범', locale: 'ko', title: '테스트 앨범'},
        {description: 'The first paid album', locale: 'en', title: 'Test Album'},
        {description: '初の有料アルバム', locale: 'ja', title: 'テストアルバム'},
        {description: '首张付费专辑', locale: 'zh-Hans', title: '测试专辑'},
      ],
    })
  })

  it('should create an album with only its required Korean metadata', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl: null,
        coverReservationId: null,
        id: ALBUM_ID,
        translations: [{description: '설명', locale: 'ko', title: '제목'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(201)
    expect(repositoryMocks.createAlbum).toHaveBeenCalledWith({
      coverDraftId: null,
      coverFallback: 'lp',
      coverImageUrl: null,
      coverReservationId: null,
      id: ALBUM_ID,
      translations: [{description: '설명', locale: 'ko', title: '제목'}],
    })
  })

  it('should preserve an older external-cover request without reservation fields', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverFallback: 'lp',
        coverImageUrl: 'https://external.example/cover.webp',
        translations: [{description: '설명', locale: 'ko', title: '제목'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(201)
    expect(repositoryMocks.createAlbum).toHaveBeenCalledWith({
      coverDraftId: null,
      coverFallback: 'lp',
      coverImageUrl: 'https://external.example/cover.webp',
      coverReservationId: null,
      id: expect.any(String),
      translations: [{description: '설명', locale: 'ko', title: '제목'}],
    })
  })

  it('should reject album metadata without a Korean title', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl: null,
        coverReservationId: null,
        translations: [{description: 'English only', locale: 'en', title: 'Album'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should reject an invalid album creation ID', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl: null,
        coverReservationId: null,
        id: 'not-a-uuid',
        translations: [{description: '설명', locale: 'ko', title: '제목'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should reject Korean metadata without a description', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl: null,
        coverReservationId: null,
        translations: [{description: '', locale: 'ko', title: '앨범'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should reject duplicate locales', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl: null,
        coverReservationId: null,
        translations: [
          {description: '설명', locale: 'ko', title: '제목'},
          {description: '다른 설명', locale: 'ko', title: '다른 제목'},
        ],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should reject a request body larger than the configured limit', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: 'x'.repeat(65_537),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(413)
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should reject an album when its cover reservation cannot be claimed', async () => {
    repositoryMocks.createAlbum.mockResolvedValue({
      code: 'cover_reservation_invalid',
      success: false,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'cover_reservation_invalid'})
  })

  it('should reject a managed cover URL without a reservation before writing', async () => {
    storageMocks.isManagedAlbumCoverUrl.mockReturnValue(true)
    const request = new Request('https://www.pomofi.io/api/admin/music/albums', {
      body: JSON.stringify({
        coverDraftId: null,
        coverFallback: 'lp',
        coverImageUrl:
          'https://storage.pomofi.io/album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf783/cover.webp',
        coverReservationId: null,
        translations: [{description: '설명', locale: 'ko', title: '제목'}],
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'cover_reservation_invalid'})
    expect(repositoryMocks.createAlbum).not.toHaveBeenCalled()
  })

  it('should hide repository failures behind a stable server error', async () => {
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repositoryMocks.createAlbum.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({error: 'album_create_failed'})
    expect(consoleError).toHaveBeenCalledWith('Failed to create a music album', error)
  })
})
