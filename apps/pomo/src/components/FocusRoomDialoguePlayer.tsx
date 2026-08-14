import {For, Show} from 'solid-js'

import {useFocusRoomEvents} from '../features/focus-room-dialogue/FocusRoomEventContext'
import './FocusRoomDialoguePlayer.css'

export interface FocusRoomDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
}

export const FocusRoomDialoguePlayer = (props: FocusRoomDialoguePlayerProps) => {
  const events = useFocusRoomEvents()
  const isExternalSpeech = () => props.externalText !== undefined && props.externalText !== null
  const text = () => props.externalText ?? events.activeText()
  const connectedSpeechCount = () =>
    isExternalSpeech() ? 1 : Math.max(1, events.scheduledDialogueCount())
  const stopLabel = () => `${connectedSpeechCount()}개 연결 음성 모두 중지`
  const handleStop = () => {
    if (isExternalSpeech()) {
      props.onStopExternalSpeech?.()
      return
    }

    events.onStopDialoguePlayback()
  }
  const handleSkip = () => events.skipDialoguePlayback()
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
      <Show when={text()}>
        {(text) => (
          <div class="focus-room-dialogue-bubble focus-room-static-focus-glass">
            <div class="focus-room-dialogue-bubble__header">
              <div class="focus-room-dialogue-bubble__speaker-group">
                <span class="focus-room-dialogue-bubble__speaker">Pomo</span>
                <Show
                  when={
                    !isExternalSpeech() &&
                    events.activeSegmentCount() > 1 &&
                    events.activeSegmentPosition() !== null
                  }
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
              <div class="focus-room-dialogue-bubble__actions">
                <Show when={!isExternalSpeech()}>
                  <button
                    aria-label="대화 건너뛰기"
                    class="focus-room-dialogue-bubble__skip"
                    onClick={handleSkip}
                    type="button"
                  >
                    <span aria-hidden="true" class="i-tabler-player-track-next size-4" />
                    대화 건너뛰기
                  </button>
                </Show>
                <button
                  aria-label={stopLabel()}
                  class="focus-room-dialogue-bubble__stop"
                  onClick={handleStop}
                  type="button"
                >
                  <span aria-hidden="true" class="i-tabler-player-stop size-4" />
                  {stopLabel()}
                </button>
              </div>
            </div>
            <p aria-live="polite" role="status">
              {text()}
            </p>
          </div>
        )}
      </Show>
      <Show when={!isExternalSpeech() && events.isDialoguePlaybackBlocked()}>
        <button
          class="focus-room-dialogue-bubble focus-room-dialogue-bubble--play focus-room-static-focus-glass"
          onClick={() => events.retryDialoguePlayback()}
          type="button"
        >
          <span aria-hidden="true" class="focus-room-dialogue-bubble__play-icon">
            <span class="i-tabler-volume size-5" />
          </span>
          <span>
            <strong>이벤트 음성 재생</strong>
            <small>브라우저에서 차단된 소리를 시작해요.</small>
          </span>
        </button>
      </Show>
    </>
  )
}
