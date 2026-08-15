import {createMemo, For, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {usePEvents} from '../features/focus-room-dialogue/PEventContext'

export interface PDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
}

export const PDialoguePlayer = (props: PDialoguePlayerProps) => {
  const events = usePEvents()
  const isExternalSpeech = () => props.externalText !== undefined && props.externalText !== null
  const liveText = () => props.externalText ?? events.activeText()
  const displayText = createMemo<string | null>((previousText) => {
    const currentText = liveText()

    if (currentText !== null) {
      return currentText
    }

    const shouldKeepContainer =
      !isExternalSpeech() &&
      !events.isDialoguePlaybackBlocked() &&
      events.scheduledDialogueCount() > 0

    return shouldKeepContainer ? previousText : null
  }, null)
  const connectedSpeechCount = createMemo(() =>
    isExternalSpeech() ? 1 : Math.max(1, events.scheduledDialogueCount()),
  )
  const stopLabel = () => `${connectedSpeechCount()}개 모두 중지`
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
      <Show when={displayText()}>
        {(text) => (
          <div class="pomo-dialogue-bubble pomo-static-focus-glass">
            <div class="pomo-dialogue-bubble__header">
              <div class="pomo-dialogue-bubble__speaker-group">
                <span class="pomo-dialogue-bubble__speaker">Pomo</span>
                <Show
                  when={
                    !isExternalSpeech() &&
                    events.activeSegmentCount() > 1 &&
                    events.activeSegmentPosition() !== null
                  }
                >
                  <span
                    aria-label={progressLabel()}
                    class="pomo-dialogue-bubble__progress"
                    role="img"
                  >
                    <For each={segmentPositions()}>
                      {(position) => (
                        <span
                          aria-hidden="true"
                          class="pomo-dialogue-bubble__progress-dot"
                          data-complete={isSegmentComplete(position) ? '' : undefined}
                        />
                      )}
                    </For>
                  </span>
                </Show>
              </div>
              <div class="pomo-dialogue-bubble__actions">
                <Show when={!isExternalSpeech()}>
                  <PButton
                    accessibleLabel="대화 건너뛰기"
                    class={
                      'pomo-dialogue-bubble__skip max-[40rem]:gap-[var(--pomo-padding-sm)] ' +
                      'max-[40rem]:px-[var(--pomo-padding-md)] ' +
                      'max-[40rem]:py-[var(--pomo-padding-sm)] max-[23rem]:gap-0'
                    }
                    icon="i-tabler-player-track-next"
                    onPress={handleSkip}
                    size="small"
                    tone="secondary"
                  >
                    <span class="hidden min-[34.0625rem]:inline">대화 건너뛰기</span>
                    <span class="hidden min-[23.0625rem]:inline min-[34.0625rem]:hidden">
                      건너뛰기
                    </span>
                  </PButton>
                </Show>
                <PButton
                  accessibleLabel={stopLabel()}
                  class={
                    'pomo-dialogue-bubble__stop max-[40rem]:gap-[var(--pomo-padding-sm)] ' +
                    'max-[40rem]:px-[var(--pomo-padding-md)] ' +
                    'max-[40rem]:py-[var(--pomo-padding-sm)]'
                  }
                  icon="i-tabler-player-stop"
                  onPress={handleStop}
                  size="small"
                  tone="secondary"
                >
                  <span class="hidden min-[34.0625rem]:inline">{stopLabel()}</span>
                  <span class="hidden min-[23.0625rem]:inline min-[34.0625rem]:hidden">
                    {connectedSpeechCount()}개 중지
                  </span>
                  <span class="inline min-[23.0625rem]:hidden">{connectedSpeechCount()}개</span>
                </PButton>
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
          class="pomo-dialogue-bubble pomo-dialogue-bubble--play pomo-static-focus-glass"
          onClick={() => events.retryDialoguePlayback()}
          type="button"
        >
          <span aria-hidden="true" class="pomo-dialogue-bubble__play-icon">
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
