import type {AdminMusicModel} from 'src/features/admin-music'

export type AlbumWorkspaceModel = Pick<
  AdminMusicModel,
  | 'catalog'
  | 'confirmingAssetId'
  | 'handleAlbumStatusChange'
  | 'handleOfferSubmit'
  | 'handleTrackConfirmation'
  | 'handleTrackRemove'
  | 'isConfirmingAsset'
  | 'isImportingTracks'
  | 'isRemovingTrack'
  | 'isSavingOffer'
  | 'isUpdatingAlbum'
  | 'removingTrackId'
  | 'runTrackImport'
  | 'submitTrack'
>

export interface AlbumTaskFormProps {
  readonly albumId: string
  readonly albumTitle: string
  readonly model: AlbumWorkspaceModel
}
