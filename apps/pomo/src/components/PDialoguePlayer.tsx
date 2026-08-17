import {cx} from 'class-variance-authority'
import {createMemo, For, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {type DialogueSegmentMood, usePEvents} from '../features/focus-room-dialogue/PEventContext'
import {getPrimaryMood, getPrimaryMoodIcon} from '../features/text-mood'

const CLASSES = {
  dialogueBubble: [
    'pomo-dialogue-bubble w-full min-h-0 max-h-full box-border overflow-hidden border',
    'border-solid rounded-2xl p-4 text-foreground',
    'shadow-[inset_0_1px_0_rgb(255_255_255_/_8%)] backdrop-filter-[blur(0.75rem)]',
    '[-webkit-backdrop-filter:blur(0.75rem)] [&_p]:min-h-0 [&_p]:overflow-y-auto [&_p]:m-0',
    '[&_p]:pr-1 [&_p]:text-[clamp(0.9rem,_2.5vw,_1rem)]',
    '[&_p]:leading-[1.65] [&_p]:[overscroll-behavior:contain]',
    '[&_p]:[scrollbar-color:rgb(255_250_241_/_24%)_transparent] [&_p]:[scrollbar-width:thin]',
  ].join(' '),
  dialogueBubbleActions: 'pomo-dialogue-bubble__actions inline-flex items-center gap-1',
  dialogueBubbleHeader: 'pomo-dialogue-bubble__header flex items-center justify-between gap-3',
  dialogueBubbleMessage: [
    'pomo-dialogue-bubble--message grid grid-rows-[auto_minmax(0,_1fr)]',
    'gap-y-2',
  ].join(' '),
  dialogueBubbleMood:
    'pomo-dialogue-bubble__mood block w-9 h-9 flex-none scale-[1.5556] object-contain',
  dialogueBubblePlay: [
    'pomo-dialogue-bubble--play flex cursor-pointer items-center gap-3',
    '[font:inherit] text-left [&_>_span:last-child]:grid',
    '[&_>_span:last-child]:gap-1 [&_strong]:text-[0.8125rem]',
    '[&_small]:text-muted-foreground [&_small]:text-[0.6875rem] [&_small]:leading-[1.5]',
  ].join(' '),
  dialogueBubblePlayIcon: [
    'pomo-dialogue-bubble__play-icon grid w-9 h-9 flex-none place-items-center rounded-full',
    'bg-secondary-soft text-highlight',
  ].join(' '),
  dialogueBubbleProgress: [
    'pomo-dialogue-bubble__progress inline-flex flex-wrap items-center',
    'gap-1',
  ].join(' '),
  dialogueBubbleProgressDot: [
    'pomo-dialogue-bubble__progress-dot w-1.5 h-1.5 box-border flex-none',
    'border border-solid border-border-hover rounded-full bg-transparent',
    '[&[data-complete]]:border-highlight [&[data-complete]]:bg-highlight',
  ].join(' '),
  dialogueBubbleSkip: 'pomo-dialogue-bubble__skip flex-none whitespace-nowrap',
  dialogueBubbleSpeakerGroup: [
    'pomo-dialogue-bubble__speaker-group inline-flex min-w-0 items-center',
    'gap-2',
  ].join(' '),
  dialogueBubbleStop: 'pomo-dialogue-bubble__stop flex-none whitespace-nowrap',
} as const

const SKIP_BUTTON_CLASS = cx(
  CLASSES.dialogueBubbleSkip,
  'max-[40rem]:gap-2 max-[40rem]:px-3',
  'max-[40rem]:py-2 max-[23rem]:gap-0',
)

const STOP_BUTTON_CLASS = cx(
  CLASSES.dialogueBubbleStop,
  'max-[40rem]:gap-2 max-[40rem]:px-3',
  'max-[40rem]:py-2',
)

export interface PDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
}

const getMoodPresentation = (mood: DialogueSegmentMood | null) => {
  const definition = getPrimaryMood(mood?.primary.id ?? 'neutral')
  return {definition, source: getPrimaryMoodIcon(definition.id)}
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
  const displayMood = createMemo<DialogueSegmentMood | null>((previousMood) => {
    if (liveText() !== null) {
      return isExternalSpeech() ? null : events.activeSegmentMood()
    }

    return displayText() === null ? null : previousMood
  }, null)
  const moodPresentation = createMemo(() => getMoodPresentation(displayMood()))
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
          <div
            class={cx(
              CLASSES.dialogueBubble,
              CLASSES.dialogueBubbleMessage,
              'border-highlight bg-surface-interactive',
            )}
          >
            <div class={CLASSES.dialogueBubbleHeader}>
              <div class={CLASSES.dialogueBubbleSpeakerGroup}>
                <img
                  alt={`${moodPresentation().definition.label} 감정`}
                  class={CLASSES.dialogueBubbleMood}
                  src={moodPresentation().source}
                />
                <Show
                  when={
                    !isExternalSpeech() &&
                    events.activeSegmentCount() > 1 &&
                    events.activeSegmentPosition() !== null
                  }
                >
                  <span
                    aria-label={progressLabel()}
                    class={CLASSES.dialogueBubbleProgress}
                    role="img"
                  >
                    <For each={segmentPositions()}>
                      {(position) => (
                        <span
                          aria-hidden="true"
                          class={CLASSES.dialogueBubbleProgressDot}
                          data-complete={isSegmentComplete(position) ? '' : undefined}
                        />
                      )}
                    </For>
                  </span>
                </Show>
              </div>
              <div class={CLASSES.dialogueBubbleActions}>
                <Show when={!isExternalSpeech()}>
                  <PButton
                    accessibleLabel="대화 건너뛰기"
                    class={SKIP_BUTTON_CLASS}
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
                  class={STOP_BUTTON_CLASS}
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
          class={cx(
            CLASSES.dialogueBubble,
            CLASSES.dialogueBubblePlay,
            'border-highlight bg-surface-interactive',
          )}
          onClick={() => events.retryDialoguePlayback()}
          type="button"
        >
          <span aria-hidden="true" class={CLASSES.dialogueBubblePlayIcon}>
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
