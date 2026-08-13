import {For, Show} from 'solid-js'

import {useFocusRoomEvents} from '../features/focus-room-dialogue/FocusRoomEventContext'
import './FocusRoomDialoguePlayer.css'

export const FocusRoomDialoguePlayer = () => {
  const events = useFocusRoomEvents()
  const segmentPositions = () =>
    Array.from({length: events.activeSegmentCount()}, (_, position) => position)
  const progressLabel = () => {
    const segmentCount = events.activeSegmentCount()
    const activePosition = events.activeSegmentPosition() ?? 0

    return `총 ${segmentCount}개 중 ${activePosition + 1}번째 대사 읽는 중`
  }
  const isSegmentComplete = (position: number) => {
    const activePosition = events.activeSegmentPosition()

    return activePosition !== null && position <= activePosition
  }

  return (
    <>
      <Show when={events.activeText()}>
        {(text) => (
          <div class="focus-room-dialogue-bubble focus-room-static-focus-glass">
            <div class="focus-room-dialogue-bubble__header">
              <div class="focus-room-dialogue-bubble__speaker-group">
                <span class="focus-room-dialogue-bubble__speaker">Pomo</span>
                <Show
                  when={events.activeSegmentCount() > 1 && events.activeSegmentPosition() !== null}
                >
                  <span
                    aria-label={progressLabel()}
                    class="focus-room-dialogue-bubble__progress"
                    role="img"
                  >
                    <For each={segmentPositions()}>
                      {(position) => (
                        <span
                          aria-hidden="true"
                          class="focus-room-dialogue-bubble__progress-dot"
                          data-complete={isSegmentComplete(position) ? '' : undefined}
                        />
                      )}
                    </For>
                  </span>
                </Show>
              </div>
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
          class="focus-room-dialogue-bubble focus-room-dialogue-bubble--play focus-room-static-focus-glass"
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
