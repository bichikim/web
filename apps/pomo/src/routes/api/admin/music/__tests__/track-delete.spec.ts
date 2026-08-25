import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  finalizeTrackDeletion: vi.fn(),
  markTrackDeletionStorageDeleted: vi.fn(),
  prepareTrackDeletion: vi.fn(),
}))
const deletionMocks = vi.hoisted(() => ({deleteTrackAssetStorage: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)
vi.mock('src/server/music/track-storage-deletion', () => deletionMocks)

import {DELETE} from '../tracks/[trackId]'
import {invokeApiRoute} from '../../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const OBJECT_KEYS = ['tracks/track/retired/source.mp3', 'tracks/track/active/source.mp3']
const createRequest = (): Request =>
  new Request(`https://www.pomofi.io/api/admin/music/tracks/${TRACK_ID}`, {method: 'DELETE'})

describe('admin music track delete route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.finalizeTrackDeletion.mockReset().mockResolvedValue(true)
    repositoryMocks.markTrackDeletionStorageDeleted.mockReset().mockResolvedValue(true)
    repositoryMocks.prepareTrackDeletion
      .mockReset()
      .mockResolvedValue({objectKeys: OBJECT_KEYS, storageDeleted: false})
    deletionMocks.deleteTrackAssetStorage.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it('should delete R2 objects before deleting track records', async () => {
    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    expect(deletionMocks.deleteTrackAssetStorage).toHaveBeenNthCalledWith(1, OBJECT_KEYS[0])
    expect(deletionMocks.deleteTrackAssetStorage).toHaveBeenNthCalledWith(2, OBJECT_KEYS[1])
    expect(repositoryMocks.markTrackDeletionStorageDeleted).toHaveBeenCalledWith(TRACK_ID)
    expect(repositoryMocks.finalizeTrackDeletion).toHaveBeenCalledWith(TRACK_ID)
  })

  it('should preserve database records when R2 deletion fails', async () => {
    deletionMocks.deleteTrackAssetStorage.mockRejectedValue(new Error('R2 unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(503)
    expect(repositoryMocks.markTrackDeletionStorageDeleted).not.toHaveBeenCalled()
    expect(repositoryMocks.finalizeTrackDeletion).not.toHaveBeenCalled()
  })

  it('should resume database cleanup without deleting R2 objects twice', async () => {
    repositoryMocks.prepareTrackDeletion.mockResolvedValue({
      objectKeys: OBJECT_KEYS,
      storageDeleted: true,
    })

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    expect(deletionMocks.deleteTrackAssetStorage).not.toHaveBeenCalled()
    expect(repositoryMocks.markTrackDeletionStorageDeleted).not.toHaveBeenCalled()
    expect(repositoryMocks.finalizeTrackDeletion).toHaveBeenCalledWith(TRACK_ID)
  })

  it('should return a controlled error when deletion preparation fails', async () => {
    repositoryMocks.prepareTrackDeletion.mockRejectedValue(new Error('database unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(500)
    expect(deletionMocks.deleteTrackAssetStorage).not.toHaveBeenCalled()
  })

  it('should reject track deletion without an administrator session', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(DELETE, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(403)
    expect(repositoryMocks.prepareTrackDeletion).not.toHaveBeenCalled()
  })
})
