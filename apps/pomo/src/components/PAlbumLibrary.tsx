import {createSignal, lazy, Show} from 'solid-js'

import {getPomoIconClass} from '../design-system/icon-style'
import type {PTrack} from '../features/focus-room-audio'
import type {PSceneStyle} from '../features/focus-room-animation'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'

const PAlbumLibraryContent = lazy(() => import('./PAlbumLibraryContent'))

export interface PAlbumLibraryProps {
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onClearTracks?: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly sceneStyle?: PSceneStyle
  readonly tracks: readonly PTrack[]
}

export const PAlbumLibrary = (props: PAlbumLibraryProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)

  return (
    <>
      <PPlayerUtilityButton
        accessibleLabel="앨범 추가"
        icon={getPomoIconClass('i-tabler-album', props.sceneStyle)}
        onPress={(source) => {
          setTriggerElement(source)
          setIsOpen(true)
        }}
        purpose="album"
      />
      <Show when={isOpen()}>
        <PAlbumLibraryContent
          isOpen={isOpen()}
          onAddTracks={props.onAddTracks}
          onClearTracks={props.onClearTracks}
          onCloseAutoFocus={() => triggerElement()?.focus()}
          onOpenChange={setIsOpen}
          onPreviewEnd={props.onPreviewEnd}
          onPreviewStart={props.onPreviewStart}
          tracks={props.tracks}
        />
      </Show>
    </>
  )
}
