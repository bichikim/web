import {type AdminMusicModel} from '../../../features/admin-music'

export interface AlbumTaskFormProps {
  readonly albumId: string
  readonly albumTitle: string
  readonly model: AdminMusicModel
}
