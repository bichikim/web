import {Show} from 'solid-js'

import {useFocusRoomEvents} from '../features/focus-room-dialogue/FocusRoomEventContext'
import './FocusRoomDialoguePlayer.css'

export const FocusRoomDialoguePlayer = () => {
  const events = useFocusRoomEvents()

  return (
    <>
      <Show when={events.activeText()}>
        {(text) => (
          <div class="focus-room-dialogue-bubble">
            <div class="focus-room-dialogue-bubble__header">
              <span class="focus-room-dialogue-bubble__speaker">Pomo</span>
              <button
                class="focus-room-dialogue-bubble__stop"
                onClick={events.onStopEntryPlayback}
                type="button"
              >
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
      <Show when={events.isEntryPlaybackBlocked()}>
        <button
          class="focus-room-dialogue-bubble focus-room-dialogue-bubble--play"
          onClick={events.retryEntryPlayback}
          type="button"
        >
          <span aria-hidden="true" class="focus-room-dialogue-bubble__play-icon">
            <span class="i-tabler-volume size-5" />
          </span>
          <span>
            <strong>이벤트 메시지를 재생하려면 눌러 주세요</strong>
            <small>브라우저에서 차단된 소리를 시작해요.</small>
          </span>
        </button>
      </Show>
    </>
  )
}
