import {createSignal, lazy, Show} from 'solid-js'

import type {PTrack} from '../features/focus-room-audio'
import {PPlayerUtilityButton} from './PPlayerUtilityButton'

const PAlbumLibraryContent = lazy(() => import('./PAlbumLibraryContent'))

export interface PAlbumLibraryProps {
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly tracks: readonly PTrack[]
}

export const PAlbumLibrary = (props: PAlbumLibraryProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)

  return (
    <>
      <PPlayerUtilityButton
        accessibleLabel="앨범 추가"
        icon="i-tabler-album"
        onPress={(source) => {
          setTriggerElement(source)
          setIsOpen(true)
        }}
      />
      <Show when={isOpen()}>
        <PAlbumLibraryContent
          isOpen={isOpen()}
          onAddTracks={props.onAddTracks}
          onCloseAutoFocus={() => triggerElement()?.focus()}
          onOpenChange={setIsOpen}
          tracks={props.tracks}
        />
      </Show>
    </>
  )
}
