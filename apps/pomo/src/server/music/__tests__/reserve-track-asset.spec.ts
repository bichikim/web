/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({savePendingTrackAsset: vi.fn()}))

vi.mock('../../repositories/music-track-registration', () => repositoryMocks)

import {createTrackAssetKey} from '../asset-key'
import {reserveTrackAsset} from '../reserve-track-asset'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const EXISTING_ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf783'
const OBJECT_KEY = createTrackAssetKey({assetId: ASSET_ID, trackId: TRACK_ID})

beforeEach(() => {
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(ASSET_ID)
  repositoryMocks.savePendingTrackAsset.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should persist a generated object key for a new pending track asset', async () => {
  repositoryMocks.savePendingTrackAsset.mockResolvedValue({status: 'created'})

  await expect(reserveTrackAsset(TRACK_ID)).resolves.toEqual({
    assetId: ASSET_ID,
    objectKey: OBJECT_KEY,
  })
  expect(repositoryMocks.savePendingTrackAsset).toHaveBeenCalledExactlyOnceWith({
    assetId: ASSET_ID,
    objectKey: OBJECT_KEY,
    trackId: TRACK_ID,
  })
})

it('should return the existing pending asset instead of the generated identity', async () => {
  const existing = {
    assetId: EXISTING_ASSET_ID,
    objectKey: createTrackAssetKey({assetId: EXISTING_ASSET_ID, trackId: TRACK_ID}),
    status: 'existing' as const,
  }
  repositoryMocks.savePendingTrackAsset.mockResolvedValue(existing)

  await expect(reserveTrackAsset(TRACK_ID)).resolves.toEqual({
    assetId: existing.assetId,
    objectKey: existing.objectKey,
  })
})

it('should return null when the track cannot reserve an asset', async () => {
  repositoryMocks.savePendingTrackAsset.mockResolvedValue({status: 'unavailable'})

  await expect(reserveTrackAsset(TRACK_ID)).resolves.toBeNull()
})
