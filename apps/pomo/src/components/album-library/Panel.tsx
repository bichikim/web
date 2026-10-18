import {createSignal, ErrorBoundary, lazy, Suspense} from 'solid-js'

import {reportClientError} from '../../features/client-error-reporter'
import type {PTrack} from '../../features/focus-room-audio'
import {PModal} from '../p-modal/PModal'
import {PlaylistFooter} from './Footer'
import {LoadingStatus} from './LoadingStatus'
import * as m from '@paraglide/message'
import {PStatus} from './PStatus'

const PAlbumLibraryContent = lazy(async () => {
  const {PAlbumLibraryContent} = await import('./Content')
  return {default: PAlbumLibraryContent}
})

export interface PAlbumLibraryPanelProps {
  readonly isOpen: boolean
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onClearTracks?: () => void
  readonly onRemoveTracks?: (trackIds: ReadonlySet<string>) => void
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly tracks: readonly PTrack[]
}

export const PAlbumLibraryPanel = (props: PAlbumLibraryPanelProps) => {
  const [clearedTracks, setClearedTracks] = createSignal<readonly PTrack[]>([])
  const addTracks = (tracks: readonly PTrack[]) => {
    setClearedTracks([])
    props.onAddTracks(tracks)
  }
  const handleClearTracks = () => {
    const currentTracks = props.tracks

    if (currentTracks.length === 0 || props.onClearTracks === undefined) {
      return
    }

    setClearedTracks(currentTracks)
    props.onClearTracks()
  }
  const handleRestoreTracks = () => {
    const tracksToRestore = clearedTracks()

    if (tracksToRestore.length === 0) {
      return
    }

    addTracks(tracksToRestore)
  }

  return (
    <PModal
      description={m.album_description()}
      footer={
        <PlaylistFooter
          canClear={props.onClearTracks !== undefined}
          clearedTrackCount={clearedTracks().length}
          onClear={handleClearTracks}
          onRestore={handleRestoreTracks}
          trackCount={props.tracks.length}
        />
      }
      isOpen={props.isOpen}
      onCloseAutoFocus={props.onCloseAutoFocus}
      onOpenChange={props.onOpenChange}
      placement="top"
      size="full"
      title={m.album_title()}
    >
      <ErrorBoundary
        fallback={(error) => {
          reportClientError(error, {feature: 'album-library', source: 'error-boundary'})

          return <PStatus message={m.album_load_failed()} role="alert" />
        }}
      >
        <Suspense fallback={<LoadingStatus />}>
          <PAlbumLibraryContent
            onAddTracks={addTracks}
            onRemoveTracks={props.onRemoveTracks}
            onPreviewEnd={props.onPreviewEnd}
            onPreviewStart={props.onPreviewStart}
            tracks={props.tracks}
          />
        </Suspense>
      </ErrorBoundary>
    </PModal>
  )
}
