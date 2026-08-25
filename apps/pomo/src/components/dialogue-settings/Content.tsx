import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js'

import {
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
  type PDialogue,
  RANDOM_DIALOGUE_EVENT,
  usePEvents,
} from '../../features/focus-room-dialogue'
import {excludeFeedDialogues, usePFeedContext} from '../../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../../features/supertonic'
import {AutomaticDialogueSettings} from './AutomaticSettings'
import {DIALOGUE_EVENTS} from './event-definitions'
import {DialogueConnectionMenu} from './ConnectionMenu'
import {DialogueEventSettingRow} from './EventSettingRow'
import {DialoguePlaybackButton} from './PlaybackButton'
import {DialoguePlaybackModeSelect} from './PlaybackModeSelect'
import {RandomEventSettings} from './RandomEventSettings'

const CLASSES = {
  dialogueSettings: 'pomo-dialogue-settings grid gap-4.5 settings-compact:gap-4',
  dialogueSettingsActions: [
    'pomo-dialogue-settings__actions [&_button]:inline-flex [&_button]:min-h-9',
    '[&_button]:box-border [&_button]:cursor-pointer [&_button]:items-center',
    '[&_button]:justify-center [&_button]:gap-[0.35rem]',
    '[&_button]:border [&_button]:border-solid [&_button]:border-border',
    '[&_button]:rounded-control [&_button]:bg-transparent [&_button]:py-0',
    '[&_button]:px-3 [&_button]:text-muted-foreground',
    '[&_button]:[font:inherit] [&_button]:text-[0.7rem] [&_button]:font-bold',
    '[&_button]:no-underline',
    '[&_button]:transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    '[&_a]:inline-flex [&_a]:min-h-9 [&_a]:box-border [&_a]:cursor-pointer [&_a]:items-center',
    '[&_a]:justify-center [&_a]:gap-[0.35rem] [&_a]:border [&_a]:border-solid [&_a]:border-border',
    '[&_a]:rounded-control [&_a]:bg-transparent [&_a]:py-0',
    '[&_a]:px-3 [&_a]:text-muted-foreground [&_a]:[font:inherit]',
    '[&_a]:text-[0.7rem] [&_a]:font-bold [&_a]:no-underline',
    '[&_a]:transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    '[&_button:hover]:bg-secondary-soft [&_button:hover]:text-foreground',
    '[&_a:hover]:bg-secondary-soft [&_a:hover]:text-foreground',
    '[&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid ' +
      '[&_button:focus-visible]:outline-highlight',
    '[&_button:focus-visible]:[outline-offset:2px]',
    '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-highlight',
    '[&_a:focus-visible]:[outline-offset:2px] flex flex-none flex-wrap gap-[0.4rem]',
    '[&_[data-pomo-dialogue-delete-confirm]]:border-[rgb(239_135_120_/_50%)]',
    '[&_[data-pomo-dialogue-delete-confirm]]:text-[#f2a398]',
    'dialogue-library-compact:gap-[0.3rem]',
    "dialogue-library-compact:[&_>_:is(button,_a)_>_[aria-hidden='true']]:hidden",
    'motion-reduce:[&_button]:transition-[none] motion-reduce:[&_a]:transition-[none]',
  ].join(' '),
  dialogueSettingsAudio: 'pomo-dialogue-settings__audio hidden',
  dialogueSettingsCreate: [
    'pomo-dialogue-settings__create ml-auto inline-flex min-h-9 box-border cursor-pointer items-center',
    'justify-center gap-[0.35rem] border border-solid border-border',
    'rounded-control bg-transparent py-0 px-3',
    'text-muted-foreground [font:inherit] text-[0.7rem] font-bold no-underline',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    'flex-none border-highlight text-foreground',
    '[&:hover]:bg-secondary-soft [&:hover]:text-foreground',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] motion-reduce:transition-[none]',
  ].join(' '),
  dialogueSettingsEmpty: [
    'pomo-dialogue-settings__empty m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center border border-dashed border-border',
  ].join(' '),
  dialogueSettingsEventHeading: [
    'pomo-dialogue-settings__event-heading grid min-w-0 grid-cols-[auto_minmax(0,_1fr)]',
    'items-center gap-[0.7rem] settings-compact:gap-2 [&_>_div:nth-child(2)]:min-w-0',
    '[&_>_div:nth-child(2)_>_div]:min-w-0 [&_>_div:nth-child(2)_>_div]:flex',
    '[&_>_div:nth-child(2)_>_div]:items-center [&_>_div:nth-child(2)_>_div]:gap-[0.45rem]',
    '[&_h5]:m-0 [&_h5]:text-foreground [&_h5]:text-[0.8125rem] [&_h5]:font-[750]',
    '[&_>_div:nth-child(2)_>_div_>_span]:rounded-full',
    '[&_>_div:nth-child(2)_>_div_>_span]:bg-[rgb(255_255_255_/_5%)]',
    '[&_>_div:nth-child(2)_>_div_>_span]:px-2 [&_>_div:nth-child(2)_>_div_>_span]:py-1',
    '[&_>_div:nth-child(2)_>_div_>_span]:text-muted-foreground',
    '[&_>_div:nth-child(2)_>_div_>_span]:text-[0.5625rem]',
    '[&_>_div:nth-child(2)_>_div_>_span]:font-bold [&_p]:m-[0.2rem_0_0]',
    '[&_p]:text-muted-foreground [&_p]:text-[0.65rem] [&_p]:leading-[1.4]',
  ].join(' '),
  dialogueSettingsEventSymbol: [
    'pomo-dialogue-settings__event-symbol grid w-9 h-9 place-items-center rounded-full',
    'bg-secondary-soft text-highlight',
  ].join(' '),
  dialogueSettingsLibraryHeading: [
    'pomo-dialogue-settings__library-heading [&_h3]:m-0 [&_h3]:text-foreground',
    '[&_h3]:text-[0.9375rem] [&_h3]:font-[750] flex items-center gap-[0.45rem]',
    'border-t border-solid border-border pt-4',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-[0.6875rem]',
  ].join(' '),
  dialogueSettingsList: [
    'pomo-dialogue-settings__list grid gap-3 m-0 p-0 list-none [&_>_li]:grid [&_>_li]:gap-3',
    'settings-compact:gap-2 settings-compact:[&_>_li]:gap-2',
    '[&_>_li]:[border:1px_solid_rgb(255_255_255_/_6%)]',
    '[&_>_li]:rounded-panel [&_>_li]:bg-[rgb(255_255_255_/_3%)]',
    '[&_>_li]:p-4 [&_>_li[data-connected]]:border-[rgb(214_181_133_/_32%)]',
    '[&_>_li[data-connected]]:bg-[rgb(214_181_133_/_5%)]',
    '[&_>_li[data-disabled]]:bg-[rgb(255_255_255_/_1.5%)]',
  ].join(' '),
  dialogueSettingsListLibrary: 'pomo-dialogue-settings__list--library [&_>_li]:py-3',
  dialogueSettingsLoading: [
    'pomo-dialogue-settings__loading m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center flex items-center justify-center gap-2',
    '[&_>_span]:animate-dialogue-settings-spin',
    'motion-reduce:[&_>_span]:animate-[none]',
  ].join(' '),
  dialogueSettingsMessage: [
    'pomo-dialogue-settings__message m-0 rounded-panel',
    'bg-[rgb(255_255_255_/_3%)] p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ].join(' '),
  dialogueSettingsSelectedDialogue: [
    'pomo-dialogue-settings__selected-dialogue flex items-end justify-between gap-3',
    'border-t border-solid border-border pt-3',
    'settings-compact:gap-2 max-md:items-stretch max-md:flex-col',
  ].join(' '),
  dialogueSettingsSelectedDialogueLibrary: [
    'pomo-dialogue-settings__selected-dialogue--library',
    '[container:pomo-dialogue-library-item_/_inline-size] border-t-0 pt-0',
  ].join(' '),
  dialogueSettingsSummary: 'pomo-dialogue-settings__summary min-w-0 flex-1',
  dialogueSettingsSummaryLibraryText: [
    'min-w-0 overflow-hidden m-0 text-foreground text-xs font-[650] leading-[1.5]',
    'text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]',
    '[white-space:normal]',
  ].join(' '),
  dialogueSettingsSummaryMetadata: ['block mt-1 text-muted-foreground text-[0.625rem]'].join(' '),
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

const getDialogueMetadata = (dialogue: PDialogue) =>
  `${getVoiceLabel(dialogue.voiceId)} · ${formatDuration(dialogue.durationMs)} · ${dialogue.segments.length}개 말풍선`

export interface PDialogueSettingsContentProps {
  readonly onRequestClose?: () => void
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Both tabs share one repository and audio playback lifecycle.
export default function PDialogueSettingsContent(props: PDialogueSettingsContentProps) {
  const events = usePEvents()
  const feeds = usePFeedContext()
  const savedDialogues = createMemo(() =>
    excludeFeedDialogues(events.dialogues(), feeds.dialogues()),
  )
  const [playingDialogueId, setPlayingDialogueId] = createSignal<string | null>(null)
  const [audioElement, setAudioElement] = createSignal<HTMLAudioElement | undefined>()
  const [message, setMessage] = createSignal<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(null)
  let playbackUrl: string | null = null
  let playbackRequestId = 0

  const stopPlayback = () => {
    playbackRequestId += 1
    const audio = audioElement()!
    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    if (playbackUrl !== null) {
      URL.revokeObjectURL(playbackUrl)
      playbackUrl = null
    }

    setPlayingDialogueId(null)
  }

  onCleanup(stopPlayback)

  const handlePlayback = async (dialogue: PDialogue) => {
    if (playingDialogueId() === dialogue.id) {
      stopPlayback()
      return
    }

    stopPlayback()
    const currentRequestId = playbackRequestId

    try {
      const audio = await events.getAudio(dialogue.audioKey)

      if (currentRequestId !== playbackRequestId) {
        return
      }

      if (audio === null) {
        setMessage('저장된 음성을 찾을 수 없어요. 대화를 다시 편집해 주세요.')
        return
      }

      const player = audioElement()!

      playbackUrl = URL.createObjectURL(audio)
      player.src = playbackUrl
      setPlayingDialogueId(dialogue.id)
      setMessage(null)
      await player.play()
    } catch (error: unknown) {
      if (currentRequestId !== playbackRequestId) {
        return
      }

      stopPlayback()
      console.error('Failed to play focus room dialogue.', error)
      setMessage('음성을 재생하지 못했어요.')
    }
  }

  const handleCharacterPlayback = (dialogue: PDialogue) => {
    stopPlayback()
    const playback = events.playDialogue(dialogue.id)

    props.onRequestClose?.()
    playback.catch((error: unknown) => {
      console.error('Failed to play saved dialogue through the character.', error)
    })
  }

  const handleEventBinding = async (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
  ) => {
    stopPlayback()

    try {
      await events.setEventDialogues(eventId, dialogueIds)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to bind focus room event dialogue.', error)
      setMessage('이벤트의 대화 연결을 변경하지 못했어요.')
    }
  }

  const handlePlaybackMode = async (
    eventId: DialogueEventId,
    playbackMode: DialogueEventPlaybackMode,
  ) => {
    stopPlayback()

    try {
      await events.setEventPlaybackMode(eventId, playbackMode)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to change focus room event playback mode.', error)
      setMessage('이벤트의 재생 모드를 변경하지 못했어요.')
    }
  }

  const handleDelete = async (dialogue: PDialogue) => {
    try {
      stopPlayback()
      await events.deleteDialogue(dialogue.id)
      setPendingDeleteId(null)
    } catch (error: unknown) {
      console.error('Failed to delete focus room dialogue.', error)
      setMessage('대화를 삭제하지 못했어요.')
    }
  }

  return (
    <>
      <audio
        class={CLASSES.dialogueSettingsAudio}
        onEnded={stopPlayback}
        preload="none"
        ref={setAudioElement}
      />
      <Tabs.Content value="events">
        <section class={CLASSES.dialogueSettings}>
          <div class={CLASSES.dialogueSettingsLibraryHeading}>
            <h3 id="pomo-dialogue-events-title">이벤트</h3>
            <span>{DIALOGUE_EVENTS.length}개</span>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class={CLASSES.dialogueSettingsLoading} role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              이벤트와 대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <ul aria-labelledby="pomo-dialogue-events-title" class={CLASSES.dialogueSettingsList}>
              <For each={DIALOGUE_EVENTS}>
                {(event) => {
                  const selectedDialogueIds = () => events.eventDialogueIds()[event.id] ?? []
                  const playbackMode = () =>
                    events.eventPlaybackModes()[event.id] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE
                  const selectedDialogues = () =>
                    selectedDialogueIds().flatMap((dialogueId) => {
                      const dialogue = savedDialogues().find((item) => item.id === dialogueId)
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
                          savedDialogues().length === 0
                            ? '대화 탭에서 먼저 대화를 만들어 주세요.'
                            : '이 이벤트에서 재생할 대화를 선택해요.'
                        }
                        label="대화 연결"
                      >
                        <DialogueConnectionMenu
                          accessibleLabel={`${event.label} 대화 연결`}
                          getMetadata={getDialogueMetadata}
                          dialogues={savedDialogues()}
                          disabled={savedDialogues().length === 0}
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
          <AutomaticDialogueSettings />

          <div class={CLASSES.dialogueSettingsLibraryHeading}>
            <h3 id="pomo-dialogue-library-list-title">저장된 대화</h3>
            <span>{savedDialogues().length}개</span>
            <A class={CLASSES.dialogueSettingsCreate} href="/dialogue">
              <span aria-hidden="true" class="i-tabler-plus size-4" />
              새 대화
            </A>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class={CLASSES.dialogueSettingsLoading} role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <Show
              when={savedDialogues().length > 0}
              fallback={
                <p class={CLASSES.dialogueSettingsEmpty}>
                  아직 저장된 대화가 없어요. 새 대화를 만들어 보세요.
                </p>
              }
            >
              <ul
                aria-labelledby="pomo-dialogue-library-list-title"
                class={cx(CLASSES.dialogueSettingsList, CLASSES.dialogueSettingsListLibrary)}
              >
                <For each={savedDialogues()}>
                  {(dialogue) => (
                    <li>
                      <div
                        class={cx(
                          CLASSES.dialogueSettingsSelectedDialogue,
                          CLASSES.dialogueSettingsSelectedDialogueLibrary,
                        )}
                      >
                        <div class={CLASSES.dialogueSettingsSummary}>
                          <p
                            class={CLASSES.dialogueSettingsSummaryLibraryText}
                            title={dialogue.text}
                          >
                            {dialogue.text}
                          </p>
                          <span class={CLASSES.dialogueSettingsSummaryMetadata}>
                            {getDialogueMetadata(dialogue)}
                          </span>
                        </div>
                        <div class={CLASSES.dialogueSettingsActions}>
                          <DialoguePlaybackButton
                            isPlaying={playingDialogueId() === dialogue.id}
                            onPress={() => handlePlayback(dialogue)}
                          />
                          <button onClick={() => handleCharacterPlayback(dialogue)} type="button">
                            <span aria-hidden="true" class="i-tabler-message-circle size-4" />
                            캐릭터로 듣기
                          </button>
                          <A href={`/dialogue?dialogueId=${encodeURIComponent(dialogue.id)}`}>
                            <span aria-hidden="true" class="i-tabler-pencil size-4" />
                            편집
                          </A>
                          <Show
                            when={pendingDeleteId() === dialogue.id}
                            fallback={
                              <button onClick={() => setPendingDeleteId(dialogue.id)} type="button">
                                삭제
                              </button>
                            }
                          >
                            <button onClick={() => setPendingDeleteId(null)} type="button">
                              취소
                            </button>
                            <button
                              class="pomo-dialogue-settings__delete-confirm"
                              data-pomo-dialogue-delete-confirm=""
                              onClick={() => handleDelete(dialogue)}
                              type="button"
                            >
                              삭제 확인
                            </button>
                          </Show>
                        </div>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
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
