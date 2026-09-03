import {cx} from 'class-variance-authority'
import {Tabs} from '@kobalte/core/tabs'
import {createMemo, createSignal, For, Show} from 'solid-js'

import {
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
  type PDialogue,
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
} from '../../features/focus-room-dialogue'
import {excludeFeedDialogues, usePFeedContext} from '../../features/focus-room-feed'
import {
  excludeLanguageLearningDialogues,
  useLanguageLearningSentences,
} from '../../features/language-learning'
import {SUPERTONIC_VOICES} from '../../features/supertonic'
import * as m from '@paraglide/message'
import {AutomaticDialogueSettings} from './AutomaticSettings'
import {getDialogueEvents} from './event-definitions'
import {DialogueConnectionMenu} from './ConnectionMenu'
import {DialogueEventSettingRow} from './EventSettingRow'
import {DialogueLibrary} from './Library'
import {DialoguePlaybackModeSelect} from './PlaybackModeSelect'
import {RandomEventSettings} from './RandomEventSettings'
import {DialogueVolumeDuckingSettings} from './VolumeDuckingSettings'
import {PSettingsActionLink} from '../settings/ActionLink'
import {PSettingsEmptyState} from '../settings/EmptyState'
import {PSettingsSectionHeading} from '../settings/SectionHeading'

const CLASSES = {
  dialogueSettings: 'pomo-dialogue-settings grid gap-4.5 settings-compact:gap-4',
  dialogueSettingsEventHeading: cx(
    'pomo-dialogue-settings__event-heading grid min-w-0 grid-cols-[auto_minmax(0,_1fr)]',
    'items-center gap-[0.7rem] settings-compact:gap-2 [&_>_div:nth-child(2)]:min-w-0',
    '[&_>_div:nth-child(2)_>_div]:min-w-0 [&_>_div:nth-child(2)_>_div]:flex',
    '[&_>_div:nth-child(2)_>_div]:items-center [&_>_div:nth-child(2)_>_div]:gap-[0.45rem]',
    '[&_h5]:m-0 [&_h5]:text-foreground [&_h5]:text-[0.8125rem] [&_h5]:font-[750]',
    '[&_>_div:nth-child(2)_>_div_>_span]:rounded-full',
    '[&_>_div:nth-child(2)_>_div_>_span]:bg-content-surface',
    '[&_>_div:nth-child(2)_>_div_>_span]:px-2 [&_>_div:nth-child(2)_>_div_>_span]:py-1',
    '[&_>_div:nth-child(2)_>_div_>_span]:text-muted-foreground',
    '[&_>_div:nth-child(2)_>_div_>_span]:text-[0.5625rem]',
    '[&_>_div:nth-child(2)_>_div_>_span]:font-bold [&_p]:m-[0.2rem_0_0]',
    '[&_p]:text-muted-foreground [&_p]:text-[0.65rem] [&_p]:leading-[1.4]',
  ),
  dialogueSettingsEventSymbol: cx(
    'pomo-dialogue-settings__event-symbol grid w-9 h-9 place-items-center rounded-full',
    'bg-secondary-soft text-highlight',
  ),
  dialogueSettingsList: cx(
    'pomo-dialogue-settings__list grid gap-3 m-0 p-0 list-none [&_>_li]:grid [&_>_li]:gap-3',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:border [&_>_li]:border-solid [&_>_li]:border-content-border',
    '[&_>_li]:rounded-panel [&_>_li]:bg-content-surface',
    '[&_>_li]:p-4 [&_>_li[data-connected]]:border-[rgb(214_181_133_/_32%)]',
    '[&_>_li[data-connected]]:bg-[rgb(214_181_133_/_5%)]',
    '[&_>_li[data-disabled]]:bg-content-surface-disabled',
  ),
  dialogueSettingsLoading: cx(
    'pomo-dialogue-settings__loading m-0 rounded-panel',
    'bg-content-surface p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center flex items-center justify-center gap-2',
    '[&_>_span]:animate-dialogue-settings-spin',
    'motion-reduce:[&_>_span]:animate-[none]',
  ),
  dialogueSettingsMessage: cx(
    'pomo-dialogue-settings__message m-0 rounded-panel',
    'bg-content-surface p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ),
} as const

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getVoiceLabel = (voiceId: PDialogue['voiceId']) =>
  SUPERTONIC_VOICES.find((voice) => voice.id === voiceId)?.label ?? voiceId

const formatBubbleCount = (count: number) =>
  count === 1 ? m.settings_dialogue_bubble_count_one() : m.settings_dialogue_bubble_count({count})

const getDialogueMetadata = (dialogue: PDialogue) =>
  [
    getVoiceLabel(dialogue.voiceId),
    formatDuration(dialogue.durationMs),
    formatBubbleCount(dialogue.segments.length),
  ].join(' · ')

export interface PDialogueSettingsContentProps {
  readonly onRequestClose?: () => void
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Both tabs share one repository and audio playback lifecycle.
export default function PDialogueSettingsContent(props: PDialogueSettingsContentProps) {
  const events = usePEvents()
  const dialogueEvents = getDialogueEvents()
  const feeds = usePFeedContext()
  const eventDialogues = createMemo(() =>
    excludeFeedDialogues(events.dialogues(), feeds.dialogues()),
  )
  const learningSentences = useLanguageLearningSentences()
  const libraryDialogues = createMemo(() =>
    excludeLanguageLearningDialogues(eventDialogues(), learningSentences()),
  )
  const libraryEntries = createMemo(() =>
    libraryDialogues().map((dialogue) => ({
      dialogue,
      metadata: getDialogueMetadata(dialogue),
    })),
  )
  const [message, setMessage] = createSignal<string | null>(null)

  const handleEventBinding = async (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
  ): Promise<void> => {
    try {
      await events.setEventDialogues(eventId, dialogueIds)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to bind focus room event dialogue.', error)
      setMessage(m.settings_events_binding_failed())
    }
  }

  const handlePlaybackMode = async (
    eventId: DialogueEventId,
    playbackMode: DialogueEventPlaybackMode,
  ): Promise<void> => {
    try {
      await events.setEventPlaybackMode(eventId, playbackMode)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to change focus room event playback mode.', error)
      setMessage(m.settings_events_playback_mode_failed())
    }
  }

  return (
    <>
      <Tabs.Content value="events">
        <section class={CLASSES.dialogueSettings}>
          <PSettingsSectionHeading
            class="pomo-dialogue-settings__library-heading"
            count={m.settings_count({count: dialogueEvents.length})}
            title={m.settings_events_title()}
            titleId="pomo-dialogue-events-title"
          />

          <Show when={events.isLoading()}>
            <div aria-live="polite" class={CLASSES.dialogueSettingsLoading} role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              {m.settings_events_loading()}
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <ul aria-labelledby="pomo-dialogue-events-title" class={CLASSES.dialogueSettingsList}>
              <For each={dialogueEvents}>
                {(event) => {
                  const selectedDialogueIds = () => events.eventDialogueIds()[event.id] ?? []
                  const playbackMode = () =>
                    events.eventPlaybackModes()[event.id] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE
                  const selectedDialogues = () =>
                    selectedDialogueIds().flatMap((dialogueId) => {
                      const dialogue = eventDialogues().find((item) => item.id === dialogueId)
                      return dialogue === undefined ? [] : [dialogue]
                    })

                  return (
                    <li data-connected={selectedDialogues().length === 0 ? undefined : ''}>
                      <div class={CLASSES.dialogueSettingsEventHeading}>
                        <span aria-hidden="true" class={CLASSES.dialogueSettingsEventSymbol}>
                          <span class={`${event.icon} size-5`} />
                        </span>
                        <div>
                          <div>
                            <h5>{event.label}</h5>
                          </div>
                          <p>{event.description}</p>
                        </div>
                      </div>

                      <Show when={event.id === RANDOM_DIALOGUE_EVENT}>
                        <RandomEventSettings />
                      </Show>

                      <DialogueEventSettingRow
                        description={
                          eventDialogues().length === 0
                            ? m.settings_event_dialogue_create_first()
                            : m.settings_event_dialogue_select_description()
                        }
                        label={m.settings_event_dialogue_connection()}
                      >
                        <DialogueConnectionMenu
                          accessibleLabel={m.settings_event_dialogue_connection_label({
                            event: event.label,
                          })}
                          getMetadata={getDialogueMetadata}
                          dialogues={eventDialogues()}
                          disabled={eventDialogues().length === 0}
                          onChange={(dialogueIds) => {
                            handleEventBinding(event.id, dialogueIds)
                          }}
                          selectedDialogueIds={selectedDialogueIds()}
                        />
                      </DialogueEventSettingRow>

                      <Show when={selectedDialogues().length > 1}>
                        <DialoguePlaybackModeSelect
                          eventLabel={event.label}
                          onChange={(nextMode) => {
                            handlePlaybackMode(event.id, nextMode)
                          }}
                          value={playbackMode()}
                        />
                      </Show>
                    </li>
                  )
                }}
              </For>
            </ul>
          </Show>

          <Show when={message() ?? events.errorMessage()}>
            {(currentMessage) => (
              <p aria-live="polite" class={CLASSES.dialogueSettingsMessage} role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>

      <Tabs.Content value="dialogue-library">
        <section class={CLASSES.dialogueSettings}>
          <DialogueVolumeDuckingSettings />

          <AutomaticDialogueSettings />

          <PSettingsSectionHeading
            actions={
              <PSettingsActionLink
                class="pomo-dialogue-settings__create ml-auto"
                href="/dialogue"
                icon="i-tabler-plus"
              >
                {m.settings_dialogue_new()}
              </PSettingsActionLink>
            }
            class="pomo-dialogue-settings__library-heading"
            count={m.settings_count({count: libraryDialogues().length})}
            title={m.settings_dialogue_saved_title()}
            titleId="pomo-dialogue-library-list-title"
          />

          <Show when={events.isLoading()}>
            <div aria-live="polite" class={CLASSES.dialogueSettingsLoading} role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              {m.settings_dialogue_loading()}
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <Show
              when={libraryDialogues().length > 0}
              fallback={
                <PSettingsEmptyState class="pomo-dialogue-settings__empty">
                  {m.settings_dialogue_empty()}
                </PSettingsEmptyState>
              }
            >
              <DialogueLibrary entries={libraryEntries()} onRequestClose={props.onRequestClose} />
            </Show>
          </Show>

          <Show when={message() ?? events.errorMessage()}>
            {(currentMessage) => (
              <p aria-live="polite" class={CLASSES.dialogueSettingsMessage} role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>
    </>
  )
}
