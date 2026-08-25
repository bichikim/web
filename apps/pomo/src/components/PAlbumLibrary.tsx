import {createSignal, Show} from 'solid-js'

import {getPomoIconClass} from './icon-style'
import type {PTrack} from '../features/focus-room-audio'
import type {PSceneStyle} from '../features/focus-room-animation'
import * as m from '@paraglide/message'
import {PAlbumLibraryPanel} from './album-library/Panel'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'

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
        accessibleLabel={m.album_open()}
        icon={getPomoIconClass('i-tabler-album', props.sceneStyle)}
        onPress={(source) => {
          setTriggerElement(source)
          setIsOpen(true)
        }}
        purpose="album"
      />
      <Show when={isOpen()}>
        <PAlbumLibraryPanel
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
