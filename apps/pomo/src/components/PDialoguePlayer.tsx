import {cx} from 'class-variance-authority'
import {createMemo, For, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type DialogueSegmentMood, usePEvents} from '../features/focus-room-dialogue/PEventContext'
import {getPrimaryMood} from '../features/text-mood'
import {PFaceIcon} from './PFaceIcon'
import {PScribblePanel} from './PScribblePanel'

const CLASSES = {
  dialogueBubble: [
    'pomo-dialogue-bubble w-full min-h-0 max-h-full box-border overflow-hidden p-4',
    'text-foreground',
    'shadow-[inset_0_1px_0_rgb(255_255_255_/_8%)] backdrop-blur-[0.75rem]',
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
  'max-lg:gap-2 max-lg:px-3',
  'max-lg:py-2 max-xs:gap-0',
)

const STOP_BUTTON_CLASS = cx(CLASSES.dialogueBubbleStop, 'max-lg:gap-2 max-lg:px-3', 'max-lg:py-2')

const getDialogueBubbleShapeClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-0' : 'rounded-2xl border border-solid'

export interface PDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
  readonly sceneStyle?: PSceneStyle
}

interface BlockedDialogueBubbleProps {
  readonly onRetry: () => void
  readonly sceneStyle?: PSceneStyle
}

const BlockedDialogueBubble = (props: BlockedDialogueBubbleProps) => (
  <PScribblePanel
    class="pomo-dialogue-bubble-frame flex w-full"
    enabled={props.sceneStyle === 'scribble'}
    frameClass="pomo-dialogue-bubble__scribble-border"
  >
    <button
      class={cx(
        CLASSES.dialogueBubble,
        CLASSES.dialogueBubblePlay,
        getDialogueBubbleShapeClasses(props.sceneStyle),
        'border-highlight bg-surface-interactive',
      )}
      onClick={() => props.onRetry()}
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
  </PScribblePanel>
)

const getMoodPresentation = (mood: DialogueSegmentMood | null) => {
  const definition = getPrimaryMood(mood?.primary.id ?? 'neutral')
  return {definition}
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
          <PScribblePanel
            class="pomo-dialogue-bubble-frame flex w-full min-h-0 max-h-full [flex:0_1_auto]"
            enabled={props.sceneStyle === 'scribble'}
            frameClass="pomo-dialogue-bubble__scribble-border"
          >
            <div
              class={cx(
                CLASSES.dialogueBubble,
                CLASSES.dialogueBubbleMessage,
                getDialogueBubbleShapeClasses(props.sceneStyle),
                'border-highlight bg-surface-interactive',
              )}
            >
              <div class={CLASSES.dialogueBubbleHeader}>
                <div class={CLASSES.dialogueBubbleSpeakerGroup}>
                  <PFaceIcon
                    alt={`${moodPresentation().definition.label} 감정`}
                    class={CLASSES.dialogueBubbleMood}
                    mood={moodPresentation().definition.id}
                    sceneStyle={props.sceneStyle}
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
                      <span class="hidden dialogue-controls-wide:inline">대화 건너뛰기</span>
                      <span class="hidden dialogue-controls-readable:inline dialogue-controls-wide:hidden">
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
                    <span class="hidden dialogue-controls-wide:inline">{stopLabel()}</span>
                    <span class="hidden dialogue-controls-readable:inline dialogue-controls-wide:hidden">
                      {connectedSpeechCount()}개 중지
                    </span>
                    <span class="inline dialogue-controls-readable:hidden">
                      {connectedSpeechCount()}개
                    </span>
                  </PButton>
                </div>
              </div>
              <p aria-live="polite" role="status">
                {text()}
              </p>
            </div>
          </PScribblePanel>
        )}
      </Show>
      <Show when={!isExternalSpeech() && events.isDialoguePlaybackBlocked()}>
        <BlockedDialogueBubble
          onRetry={events.retryDialoguePlayback}
          sceneStyle={props.sceneStyle}
        />
      </Show>
    </>
  )
}
