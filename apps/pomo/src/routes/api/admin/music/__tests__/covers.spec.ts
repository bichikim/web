import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const reservationMocks = vi.hoisted(() => ({
  completeAlbumCoverReservation: vi.fn(),
  createAlbumCoverReservation: vi.fn(),
}))
const uploadMocks = vi.hoisted(() => ({storeAlbumCover: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/album-cover-reservation', () => reservationMocks)
vi.mock('src/server/music/cover-upload', () => uploadMocks)

import {POST} from '../covers'
import {invokeApiRoute} from '../../../__tests__/invoke'

const createRequest = (body: BodyInit, contentType = 'image/webp'): Request =>
  new Request('https://www.pomofi.io/api/admin/music/covers', {
    body,
    headers: {
      'Content-Type': contentType,
      'X-Pomo-Cover-Id': '019d1990-1dc9-7255-a7b5-f9459dfaf782',
    },
    method: 'POST',
  })

describe('admin music cover upload route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({
      authorized: true,
      cookies: [],
    })
    uploadMocks.storeAlbumCover.mockReset().mockResolvedValue({
      coverImageUrl:
        'https://storage.pomofi.io/album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf783/cover.webp',
    })
    reservationMocks.createAlbumCoverReservation.mockReset().mockResolvedValue({
      id: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      objectKey: 'album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf783/cover.webp',
    })
    reservationMocks.completeAlbumCoverReservation.mockReset().mockResolvedValue(true)
  })

  it('should reject a cover upload before signing when the session is not admin', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(POST, createRequest('webp'))

    expect(response.status).toBe(403)
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })

  it('should store a bounded WebP for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest('webp'))

    expect(response.status).toBe(200)
    expect(uploadMocks.storeAlbumCover).toHaveBeenCalledWith(
      {body: expect.any(ArrayBuffer), contentType: 'image/webp'},
      {id: '019d1990-1dc9-7255-a7b5-f9459dfaf783'},
    )
    expect(reservationMocks.createAlbumCoverReservation).toHaveBeenCalledExactlyOnceWith(
      '019d1990-1dc9-7255-a7b5-f9459dfaf782',
    )
    expect(reservationMocks.completeAlbumCoverReservation).toHaveBeenCalledExactlyOnceWith(
      '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      'https://storage.pomofi.io/album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf783/cover.webp',
    )
    await expect(response.json()).resolves.toEqual({
      coverImageUrl:
        'https://storage.pomofi.io/album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf783/cover.webp',
      coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
    })
  })

  it('should reject unsupported images', async () => {
    const response = await invokeApiRoute(POST, createRequest('<svg/>', 'image/svg+xml'))

    expect(response.status).toBe(415)
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })

  it('should reject a request without a content type', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/covers', {
      body: 'webp',
      headers: {'X-Pomo-Cover-Id': '019d1990-1dc9-7255-a7b5-f9459dfaf782'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(415)
  })

  it('should reject an invalid cover identifier', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/covers', {
      body: 'webp',
      headers: {'Content-Type': 'IMAGE/WEBP', 'X-Pomo-Cover-Id': 'invalid'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_cover_id'})
  })

  it('should reject an empty cover', async () => {
    const response = await invokeApiRoute(POST, createRequest(new Uint8Array()))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_cover'})
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })

  it('should reject a prepared cover larger than four MiB before R2 storage', async () => {
    // oxlint-disable-next-line eslint/no-magic-numbers -- One byte over the four MiB boundary.
    const oversizedCover = new Uint8Array(4 * 1024 * 1024 + 1)
    const response = await invokeApiRoute(POST, createRequest(oversizedCover))

    expect(response.status).toBe(413)
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })

  it('should return a controlled error when cover storage fails', async () => {
    const error = new Error('R2 unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    uploadMocks.storeAlbumCover.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest('webp'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({error: 'cover_upload_unavailable'})
    expect(consoleError).toHaveBeenCalledWith('Failed to create an album cover upload', error)
  })

  it('should retain an uploaded cover for maintenance when reservation completion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    reservationMocks.completeAlbumCoverReservation.mockResolvedValue(false)

    const response = await invokeApiRoute(POST, createRequest('webp'))

    expect(response.status).toBe(503)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to create an album cover upload',
      expect.objectContaining({message: 'Failed to complete an album cover reservation'}),
    )
  })
})
