import {Show} from 'solid-js'

import {useFocusRoomEvents} from '../features/focus-room-dialogue/FocusRoomEventContext'
import './FocusRoomDialoguePlayer.css'

export interface FocusRoomDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
}

export const FocusRoomDialoguePlayer = (props: FocusRoomDialoguePlayerProps) => {
  const events = useFocusRoomEvents()
  const text = () => props.externalText ?? events.activeText()
  const handleStop = () => {
    if (props.externalText !== undefined && props.externalText !== null) {
      props.onStopExternalSpeech?.()
      return
    }

    events.onStopEntryPlayback()
  }

  return (
    <>
      <Show when={text()}>
        {(text) => (
          <div class="focus-room-dialogue-bubble">
            <div class="focus-room-dialogue-bubble__header">
              <span class="focus-room-dialogue-bubble__speaker">Pomo</span>
              <button class="focus-room-dialogue-bubble__stop" onClick={handleStop} type="button">
                <span aria-hidden="true" class="i-tabler-player-stop size-4" />
                음성 중지
              </button>
            </div>
            <p aria-live="polite" role="status">
              {text()}
            </p>
          </div>
        )}
      </Show>
      <Show
        when={
          (props.externalText === null || props.externalText === undefined) &&
          events.isEntryPlaybackBlocked()
        }
      >
        <button
          class="focus-room-dialogue-bubble focus-room-dialogue-bubble--play"
          onClick={() => events.retryEntryPlayback()}
          type="button"
        >
          <span aria-hidden="true" class="focus-room-dialogue-bubble__play-icon">
            <span class="i-tabler-volume size-5" />
          </span>
          <span>
            <strong>입장 음성 재생</strong>
            <small>브라우저에서 차단된 소리를 시작해요.</small>
          </span>
        </button>
      </Show>
    </>
  )
}
