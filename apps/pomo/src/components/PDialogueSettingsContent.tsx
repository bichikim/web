import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js'

import {type DialogueEventId, type PDialogue, usePEvents} from '../features/focus-room-dialogue'
import {excludeFeedDialogues, usePFeedContext} from '../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../features/supertonic'
import {AutomaticDialogueSettings} from './AutomaticDialogueSettings'
import {DialogueConnectionMenu} from './DialogueConnectionMenu'

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
  dialogueSettingsConnection: [
    'pomo-dialogue-settings__connection grid grid-cols-[auto_minmax(0,_1fr)] items-center gap-2',
    '[&_>_span]:text-muted-foreground [&_>_span]:text-[0.6875rem] [&_>_span]:font-bold',
    'settings-compact:col-span-full settings-compact:grid-cols-[auto_minmax(0,_1fr)]',
  ].join(' '),
  dialogueSettingsCreate: [
    'pomo-dialogue-settings__create inline-flex min-h-9 box-border cursor-pointer items-center',
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
    'pomo-dialogue-settings__event-heading grid min-w-0 grid-cols-[auto_minmax(0,_1fr)_auto]',
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
    'settings-compact:grid-cols-[auto_minmax(0,_1fr)]',
  ].join(' '),
  dialogueSettingsEventSymbol: [
    'pomo-dialogue-settings__event-symbol grid w-9 h-9 place-items-center rounded-full',
    'bg-secondary-soft text-highlight',
  ].join(' '),
  dialogueSettingsHeading: [
    'pomo-dialogue-settings__heading flex items-center justify-between gap-4 [&_>_div]:min-w-0',
    'settings-compact:gap-3',
    '[&_h3]:m-0 [&_h3]:text-foreground [&_h3]:text-[0.9375rem] [&_h3]:font-[750]',
    '[&_p]:m-[0.25rem_0_0] [&_p]:text-muted-foreground [&_p]:text-[0.6875rem]',
    '[&_p]:leading-[1.5]',
  ].join(' '),
  dialogueSettingsLibraryHeading: [
    'pomo-dialogue-settings__library-heading [&_h4]:m-0 [&_h4]:text-foreground',
    '[&_h4]:text-[0.9375rem] [&_h4]:font-[750] flex items-center gap-[0.45rem]',
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
  dialogueSettingsSequence: [
    'pomo-dialogue-settings__sequence grid gap-[0.4rem] m-0',
    'border-t border-solid border-border px-0 pb-0 pt-3 list-none settings-compact:pt-2',
    '[&_>_li]:grid [&_>_li]:min-w-0 [&_>_li]:grid-cols-[1.25rem_minmax(0,_1fr)]',
    '[&_>_li]:items-center [&_>_li]:gap-2 [&_>_li_>_span]:grid [&_>_li_>_span]:w-5',
    '[&_>_li_>_span]:h-5 [&_>_li_>_span]:place-items-center [&_>_li_>_span]:rounded-full',
    '[&_>_li_>_span]:bg-secondary-soft [&_>_li_>_span]:text-highlight',
    '[&_>_li_>_span]:text-[0.625rem] [&_>_li_>_span]:font-[750] [&_p]:min-w-0',
    '[&_p]:overflow-hidden [&_p]:m-0 [&_p]:text-muted-foreground [&_p]:text-[0.6875rem]',
    '[&_p]:leading-[1.5] [&_p]:text-ellipsis [&_p]:whitespace-nowrap',
  ].join(' '),
  dialogueSettingsSummary: 'pomo-dialogue-settings__summary min-w-0 flex-1',
  dialogueSettingsSummaryLibraryText: [
    'min-w-0 overflow-hidden m-0 text-foreground text-xs font-[650] leading-[1.5]',
    'text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]',
    '[white-space:normal]',
  ].join(' '),
  dialogueSettingsSummaryMetadata: ['block mt-1 text-muted-foreground text-[0.625rem]'].join(' '),
  dialogueSettingsUnconnected: [
    'pomo-dialogue-settings__unconnected m-0 border-t border-solid border-border',
    'pt-3 text-muted-foreground text-[0.6875rem] leading-[1.5]',
  ].join(' '),
} as const

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

interface DialogueEventDefinition {
  readonly description: string
  readonly icon: string
  readonly id: DialogueEventId
  readonly label: string
}

const DIALOGUE_EVENTS: ReadonlyArray<DialogueEventDefinition> = [
  {
    description: 'Pomofi에 들어올 때 한 번 재생',
    icon: 'i-tabler-door-enter',
    id: 'room-enter',
    label: '입장',
  },
  {
    description: '집중 시간이 시작될 때 재생',
    icon: 'i-tabler-player-play',
    id: 'focus-start',
    label: '포모도르 집중 시작',
  },
  {
    description: '집중 시간이 끝날 때 재생',
    icon: 'i-tabler-player-stop',
    id: 'focus-end',
    label: '포모도르 집중 종료',
  },
  {
    description: '휴식 시간이 시작될 때 재생',
    icon: 'i-tabler-coffee',
    id: 'break-start',
    label: '포모도르 휴식 시작',
  },
  {
    description: '휴식 시간이 끝날 때 재생',
    icon: 'i-tabler-alarm',
    id: 'break-end',
    label: '포모도르 휴식 종료',
  },
]

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

interface DialoguePlaybackButtonProps {
  readonly isPlaying: boolean
  readonly onPress: () => void
}

const DialoguePlaybackButton = (props: DialoguePlaybackButtonProps) => (
  <button aria-pressed={props.isPlaying} onClick={() => props.onPress()} type="button">
    <span
      aria-hidden="true"
      class={`${props.isPlaying ? 'i-tabler-player-stop' : 'i-tabler-player-play'} size-4`}
    />
    {props.isPlaying ? '중지' : '듣기'}
  </button>
)

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
    const audio = audioElement()

    if (audio !== undefined) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }

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

      const player = audioElement()

      if (player === undefined) {
        setMessage('음성 재생기를 준비하지 못했어요.')
        return
      }

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
    events.onStopDialoguePlayback()
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
        <section class={CLASSES.dialogueSettings} aria-labelledby="pomo-events-title">
          <div class={CLASSES.dialogueSettingsHeading}>
            <div>
              <h3 id="pomo-events-title">이벤트별 대화</h3>
              <p>여러 대화를 선택하면 선택한 순서대로 연속 재생해요.</p>
            </div>
          </div>

          <div class={CLASSES.dialogueSettingsLibraryHeading}>
            <h4 id="pomo-dialogue-events-title">이벤트</h4>
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
                        <div class={CLASSES.dialogueSettingsConnection}>
                          <span>대화 연결</span>
                          <DialogueConnectionMenu
                            getMetadata={getDialogueMetadata}
                            dialogues={savedDialogues()}
                            disabled={savedDialogues().length === 0}
                            onChange={(dialogueIds) => {
                              handleEventBinding(event.id, dialogueIds).catch((error: unknown) => {
                                console.error('Unexpected event binding failure.', error)
                              })
                            }}
                            selectedDialogueIds={selectedDialogueIds()}
                          />
                        </div>
                      </div>

                      <Show when={selectedDialogues().length > 0}>
                        <ol
                          aria-label={`${event.label} 대화 재생 순서`}
                          class={CLASSES.dialogueSettingsSequence}
                        >
                          <For each={selectedDialogues()}>
                            {(dialogue, index) => (
                              <li>
                                <span>{index() + 1}</span>
                                <p title={dialogue.text}>{dialogue.text}</p>
                              </li>
                            )}
                          </For>
                        </ol>
                      </Show>

                      <Show when={selectedDialogues().length === 0}>
                        <p class={CLASSES.dialogueSettingsUnconnected}>
                          {savedDialogues().length === 0
                            ? '대화 탭에서 먼저 대화를 만들어 주세요.'
                            : '연결된 대화가 없어요.'}
                        </p>
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
        <section class={CLASSES.dialogueSettings} aria-labelledby="pomo-dialogue-library-title">
          <div class={CLASSES.dialogueSettingsHeading}>
            <div>
              <h3 id="pomo-dialogue-library-title">내 대화</h3>
              <p>저장된 대화를 듣거나 관리할 수 있어요.</p>
            </div>
            <A class={CLASSES.dialogueSettingsCreate} href="/dialogue">
              <span aria-hidden="true" class="i-tabler-plus size-4" />
              새 대화
            </A>
          </div>

          <AutomaticDialogueSettings />

          <div class={CLASSES.dialogueSettingsLibraryHeading}>
            <h4 id="pomo-dialogue-library-list-title">저장된 대화</h4>
            <span>{savedDialogues().length}개</span>
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
