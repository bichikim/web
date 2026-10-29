export interface MusicTrack {
  readonly id: string
  readonly title: string
  readonly src: string
  readonly artwork?: string
  readonly artist?: string
}

export interface MusicAlbum {
  readonly id: string
  readonly title: string
  readonly artist: string
  readonly artwork?: string
  readonly tracks: readonly MusicTrack[]
}

export interface MusicLibrary {
  readonly version: 1
  readonly albums: readonly MusicAlbum[]
}
