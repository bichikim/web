import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  deleteTrackRecords: vi.fn(),
  findRemovableTrack: vi.fn(),
}))
const uploadMocks = vi.hoisted(() => ({deleteTrackObject: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)
vi.mock('src/server/music/track-upload', () => uploadMocks)

import {DELETE} from '../tracks/[trackId]'
import {invokeApiRoute} from '../../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const OBJECT_KEYS = ['tracks/track/retired/source.mp3', 'tracks/track/active/source.mp3']
const createRequest = (): Request =>
  new Request(`https://www.pomofi.io/api/admin/music/tracks/${TRACK_ID}`, {method: 'DELETE'})

describe('admin music track delete route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.deleteTrackRecords.mockReset().mockResolvedValue(true)
    repositoryMocks.findRemovableTrack.mockReset().mockResolvedValue({objectKeys: OBJECT_KEYS})
    uploadMocks.deleteTrackObject.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it('should delete R2 objects before deleting track records', async () => {
    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    expect(uploadMocks.deleteTrackObject).toHaveBeenNthCalledWith(1, OBJECT_KEYS[0])
    expect(uploadMocks.deleteTrackObject).toHaveBeenNthCalledWith(2, OBJECT_KEYS[1])
    expect(repositoryMocks.deleteTrackRecords).toHaveBeenCalledWith(TRACK_ID)
  })

  it('should preserve database records when R2 deletion fails', async () => {
    uploadMocks.deleteTrackObject.mockRejectedValue(new Error('R2 unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(503)
    expect(repositoryMocks.deleteTrackRecords).not.toHaveBeenCalled()
  })

  it('should reject track deletion without an administrator session', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(403)
    expect(repositoryMocks.findRemovableTrack).not.toHaveBeenCalled()
  })
})
