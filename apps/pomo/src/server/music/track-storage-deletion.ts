import {getTrackAssetId} from './asset-key'
import {deleteTrackArtwork} from './cover-upload'
import {deleteTrackObject} from './track-upload'

/** Deletes every R2 object owned by one paid-track asset. */
export const deleteTrackAssetStorage = async (objectKey: string): Promise<void> => {
  const assetId = getTrackAssetId(objectKey)

  await Promise.all([deleteTrackObject(objectKey), deleteTrackArtwork(assetId)])
}
