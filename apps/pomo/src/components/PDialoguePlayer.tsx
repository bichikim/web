import {cx} from 'class-variance-authority'
import {createMemo, For, Show} from 'solid-js'

import {PButton} from './PButton'
import {PTag} from './PTag'
import type {PSceneStyle} from '../features/focus-room-animation'
import {type DialogueSegmentMood, usePEvents} from '../features/focus-room-dialogue'
import {getPrimaryMood} from '../features/text-mood'
import * as m from '@paraglide/message'
import {BlockedDialogueBubble} from './dialogue-player/BlockedBubble'
import {CLASSES, getDialogueBubbleShapeClasses} from './dialogue-player/shared'
import {PFaceIcon} from './PFaceIcon'
import {PScribblePanel} from './scribble/Panel'

const SKIP_BUTTON_CLASS = cx(
  CLASSES.dialogueBubbleSkip,
  'max-lg:gap-2 max-lg:px-3',
  'max-lg:py-2 max-xs:gap-0',
)

const STOP_BUTTON_CLASS = cx(CLASSES.dialogueBubbleStop, 'max-lg:gap-2 max-lg:px-3', 'max-lg:py-2')

export interface PDialoguePlayerProps {
  readonly externalText?: string | null
  readonly onStopExternalSpeech?: () => void
  readonly sceneStyle?: PSceneStyle
}

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
  const stopLabel = () => m.dialogue_stop_all({count: connectedSpeechCount()})
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
    const activePosition = events.activeSegmentPosition()!

    return m.dialogue_progress({current: activePosition + 1, total: segmentCount})
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
                    alt={m.dialogue_mood_alt({mood: moodPresentation().definition.label})}
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
                      accessibleLabel={m.dialogue_skip()}
                      class={SKIP_BUTTON_CLASS}
                      icon="i-tabler-player-track-next"
                      onPress={handleSkip}
                      size="small"
                      tone="secondary"
                    >
                      <span class="hidden dialogue-controls-wide:inline">{m.dialogue_skip()}</span>
                      <span class="hidden dialogue-controls-readable:inline dialogue-controls-wide:hidden">
                        {m.dialogue_skip_short()}
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
                      {m.dialogue_stop_count({count: connectedSpeechCount()})}
                    </span>
                    <span class="inline dialogue-controls-readable:hidden">
                      {m.dialogue_count({count: connectedSpeechCount()})}
                    </span>
                  </PButton>
                </div>
              </div>
              <p aria-live="polite" role="status">
                {text()} <PTag class="ml-[0.45em] align-[0.08em]">{m.common_ai_voice()}</PTag>
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
