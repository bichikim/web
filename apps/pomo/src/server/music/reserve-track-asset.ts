import {savePendingTrackAsset} from '../repositories/music-track-registration'
import {createTrackAssetKey} from './asset-key'

/** Reserves a pending paid-track object key, reusing an existing pending asset when one exists. */
export const reserveTrackAsset = async (trackId: string) => {
  const assetId = crypto.randomUUID()
  const objectKey = createTrackAssetKey({assetId, trackId})
  const result = await savePendingTrackAsset({assetId, objectKey, trackId})

  switch (result.status) {
    case 'created':
      return {assetId, objectKey}
    case 'existing':
      return {assetId: result.assetId, objectKey: result.objectKey}
    case 'unavailable':
      return null
    default: {
      const unhandledStatus: never = result
      throw new Error(`Unhandled pending track asset status: ${unhandledStatus}`)
    }
  }
}
