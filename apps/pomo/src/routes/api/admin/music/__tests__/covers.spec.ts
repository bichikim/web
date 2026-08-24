import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const uploadMocks = vi.hoisted(() => ({storeAlbumCover: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
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
      coverImageUrl: 'https://storage.pomofi.io/album-covers/id/cover.webp',
    })
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
      {id: '019d1990-1dc9-7255-a7b5-f9459dfaf782'},
    )
  })

  it('should reject unsupported images', async () => {
    const response = await invokeApiRoute(POST, createRequest('<svg/>', 'image/svg+xml'))

    expect(response.status).toBe(415)
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })

  it('should reject a prepared cover larger than four MiB before R2 storage', async () => {
    // oxlint-disable-next-line eslint/no-magic-numbers -- One byte over the four MiB boundary.
    const oversizedCover = new Uint8Array(4 * 1024 * 1024 + 1)
    const response = await invokeApiRoute(POST, createRequest(oversizedCover))

    expect(response.status).toBe(413)
    expect(uploadMocks.storeAlbumCover).not.toHaveBeenCalled()
  })
})
