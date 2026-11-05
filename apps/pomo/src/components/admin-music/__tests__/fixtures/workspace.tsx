import type {Component, JSX} from 'solid-js'
import type {AdminAlbum} from 'src/features/admin-music'

interface PreviewProps {
  readonly active: boolean
  readonly autoplay: boolean
  readonly fallback: unknown
  readonly onPlay: () => void
  readonly onRequest: () => void
  readonly title: string
  readonly trackId: string
}

interface ReleaseCardProps {
  readonly activeOfferCount: number
  readonly album: AdminAlbum
  readonly onPublicSettingsSelect: () => void
  readonly trackCount: number
}

interface TrackFieldsProps {
  readonly artist: string
  readonly onArtistChange: (value: string) => void
  readonly onTitleChange: (value: string) => void
  readonly resetVersion: number
  readonly title: string
}

// oxlint-disable solid/reactivity -- Preserve eager getter reads and render-time callback binding from the original test substitutes.
export const clientOnly = (): Component<PreviewProps> => (props: PreviewProps) => {
  // oxlint-disable-next-line no-void -- Reading the fallback getter is part of the existing substitute contract.
  void props.fallback
  return (
    <button
      aria-label={`${props.title} 미리듣기`}
      data-active={String(props.active)}
      data-autoplay={String(props.autoplay)}
      data-track-id={props.trackId}
      onClick={props.onRequest}
      onDblClick={props.onPlay}
      type="button"
    >
      미리듣기
    </button>
  )
}

export const AlbumReleaseCard = (props: ReleaseCardProps): JSX.Element => {
  // oxlint-disable-next-line no-void -- Preserve the album getter read performed by the original substitute.
  void props.album
  return (
    <button onClick={props.onPublicSettingsSelect} type="button">
      공개 설정 {props.trackCount}/{props.activeOfferCount}
    </button>
  )
}

// oxlint-enable solid/reactivity

export const TrackFields = (props: TrackFieldsProps): JSX.Element => (
  <div data-reset={props.resetVersion}>
    <button onClick={() => props.onArtistChange('새 가수')} type="button">
      가수 변경
    </button>
    <button onClick={() => props.onTitleChange('새 제목')} type="button">
      제목 변경
    </button>
    <span>{props.artist}</span>
    <span>{props.title}</span>
  </div>
)
