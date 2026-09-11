import {Show} from 'solid-js'

import {ADDED_TRACK} from './player-fixtures'

export interface AlbumLibraryFixtureProps {
  readonly onAddTracks: (tracks: readonly (typeof ADDED_TRACK)[]) => void
  readonly onClearTracks?: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly stopPreview: () => void
}

export const AlbumLibraryFixture = (props: AlbumLibraryFixtureProps) => (
  <>
    <button onClick={() => props.onAddTracks([ADDED_TRACK])} type="button">
      앨범 추가
    </button>
    <Show when={props.onClearTracks !== undefined}>
      <button onClick={() => props.onClearTracks?.()} type="button">
        재생목록 모두 비우기
      </button>
    </Show>
    <button onClick={() => props.onPreviewStart?.(props.stopPreview)} type="button">
      미리듣기 시작
    </button>
    <button onClick={() => props.onPreviewEnd?.()} type="button">
      미리듣기 종료
    </button>
  </>
)
