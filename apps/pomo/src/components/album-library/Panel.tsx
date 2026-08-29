import {createSignal, ErrorBoundary, lazy, Suspense} from 'solid-js'

import {reportClientError} from '../../features/client-error-reporter'
import type {PTrack} from '../../features/focus-room-audio'
import {PModal} from '../PModal'
import {PlaylistFooter} from './Footer'
import {LoadingStatus} from './LoadingStatus'
import * as m from '@paraglide/message'

const PAlbumLibraryContent = lazy(() => import('./Content'))

export interface PAlbumLibraryPanelProps {
  readonly isOpen: boolean
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onClearTracks?: () => void
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

          return (
            <div
              class="grid min-h-32 place-items-center rounded-control border border-dashed
                border-border p-5 text-center"
              role="alert"
            >
              <div>
                <span
                  aria-hidden="true"
                  class="i-tabler-music-off mx-auto mb-2 block size-6 text-highlight"
                />
                <p class="m-0 text-sm font-650">{m.album_load_failed()}</p>
              </div>
            </div>
          )
        }}
      >
        <Suspense fallback={<LoadingStatus />}>
          <PAlbumLibraryContent
            onAddTracks={addTracks}
            onPreviewEnd={props.onPreviewEnd}
            onPreviewStart={props.onPreviewStart}
            tracks={props.tracks}
          />
        </Suspense>
      </ErrorBoundary>
    </PModal>
  )
}
