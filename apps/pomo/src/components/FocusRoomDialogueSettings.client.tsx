import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {createMemo, createSignal, For, onCleanup, Show} from 'solid-js'

import {useFocusRoomEvents} from '../features/focus-room-dialogue/FocusRoomEventContext'
import type {FocusRoomDialogue} from '../features/focus-room-dialogue/schema'
import {excludeFeedDialogues, useFocusRoomFeedContext} from '../features/focus-room-feed'
import {SUPERTONIC_VOICES} from '../features/supertonic'
import './FocusRoomDialogueSettings.css'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

type DialogueEventId = 'break-start' | 'entry' | 'focus-start'

interface DialogueEventDefinition {
  readonly description: string
  readonly enabled: boolean
  readonly icon: string
  readonly id: DialogueEventId
  readonly label: string
}

const DIALOGUE_EVENTS: ReadonlyArray<DialogueEventDefinition> = [
  {
    description: '집중룸을 열 때 한 번 재생',
    enabled: true,
    icon: 'i-tabler-door-enter',
    id: 'entry',
    label: '입장',
  },
  {
    description: '집중 시간이 시작될 때 재생',
    enabled: false,
    icon: 'i-tabler-player-play',
    id: 'focus-start',
    label: '포모도르 집중 시작',
  },
  {
    description: '휴식 시간이 시작될 때 재생',
    enabled: false,
    icon: 'i-tabler-coffee',
    id: 'break-start',
    label: '포모도르 휴식 시작',
  },
]

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getVoiceLabel = (voiceId: FocusRoomDialogue['voiceId']) =>
  SUPERTONIC_VOICES.find((voice) => voice.id === voiceId)?.label ?? voiceId

const getDialogueMetadata = (dialogue: FocusRoomDialogue) =>
  `${getVoiceLabel(dialogue.voiceId)} · ${formatDuration(dialogue.durationMs)} · ${dialogue.segments.length}개 말풍선`

interface DialogueConnectionMenuProps {
  readonly dialogues: ReadonlyArray<FocusRoomDialogue>
  readonly disabled: boolean
  readonly onChange: (dialogueIds: ReadonlyArray<string>) => void
  readonly selectedDialogueIds: ReadonlyArray<string>
}

const DialogueConnectionMenu = (props: DialogueConnectionMenuProps) => {
  const selectedDialogues = () =>
    props.selectedDialogueIds.flatMap((dialogueId) => {
      const dialogue = props.dialogues.find((item) => item.id === dialogueId)
      return dialogue === undefined ? [] : [dialogue]
    })
  const triggerLabel = () => {
    const selected = selectedDialogues()

    if (selected.length === 0) {
      return props.dialogues.length === 0 ? '대화 없음' : '대화 선택'
    }

    return selected.length === 1 ? selected[0]?.text : `${selected.length}개 대화 연속 재생`
  }
  const toggleDialogue = (dialogueId: string, isChecked: boolean) => {
    const currentIds = props.selectedDialogueIds
    const dialogueIds = isChecked
      ? [...currentIds.filter((id) => id !== dialogueId), dialogueId]
      : currentIds.filter((id) => id !== dialogueId)
    props.onChange(dialogueIds)
  }

  return (
    <DropdownMenu gutter={6} placement="bottom-end">
      <DropdownMenu.Trigger
        class="focus-room-dialogue-settings__dialogue-trigger"
        disabled={props.disabled}
      >
        <span
          class="focus-room-dialogue-settings__dialogue-trigger-text"
          title={selectedDialogues()
            .map((dialogue) => dialogue.text)
            .join('\n')}
        >
          {triggerLabel()}
        </span>
        <DropdownMenu.Icon class="focus-room-dialogue-settings__dialogue-icon">
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </DropdownMenu.Icon>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="focus-room-backdrop focus-room-dialogue-settings__dialogue-menu">
          <DropdownMenu.Item
            class="focus-room-dialogue-settings__dialogue-item focus-room-dialogue-settings__dialogue-item--clear"
            disabled={props.selectedDialogueIds.length === 0}
            onSelect={() => props.onChange([])}
          >
            <span aria-hidden="true" class="i-tabler-unlink size-4" />
            <span class="focus-room-dialogue-settings__dialogue-item-text">
              <strong>모두 연결 해제</strong>
            </span>
          </DropdownMenu.Item>
          <For each={props.dialogues}>
            {(dialogue) => (
              <DropdownMenu.CheckboxItem
                checked={props.selectedDialogueIds.includes(dialogue.id)}
                class="focus-room-dialogue-settings__dialogue-item"
                onChange={(isChecked) => toggleDialogue(dialogue.id, isChecked)}
              >
                <DropdownMenu.ItemIndicator
                  class="focus-room-dialogue-settings__dialogue-indicator"
                  forceMount
                >
                  <span aria-hidden="true" class="i-tabler-check size-3.5" />
                </DropdownMenu.ItemIndicator>
                <span class="focus-room-dialogue-settings__dialogue-item-text">
                  <strong title={dialogue.text}>{dialogue.text}</strong>
                  <small>{getDialogueMetadata(dialogue)}</small>
                </span>
              </DropdownMenu.CheckboxItem>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}

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

// oxlint-disable-next-line eslint/max-lines-per-function -- Both tabs share one repository and audio playback lifecycle.
export default function FocusRoomDialogueSettingsClient() {
  const events = useFocusRoomEvents()
  const feeds = useFocusRoomFeedContext()
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

  const handlePlayback = async (dialogue: FocusRoomDialogue) => {
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

  const handleEntryBinding = async (dialogueIds: ReadonlyArray<string>) => {
    stopPlayback()

    try {
      await events.setEntryDialogues(dialogueIds)
      setMessage(null)
    } catch (error: unknown) {
      console.error('Failed to bind focus room entry dialogue.', error)
      setMessage('입장 이벤트의 대화 연결을 변경하지 못했어요.')
    }
  }

  const handleDelete = async (dialogue: FocusRoomDialogue) => {
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
        class="focus-room-dialogue-settings__audio"
        onEnded={stopPlayback}
        preload="none"
        ref={setAudioElement}
      />
      <Tabs.Content value="events">
        <section class="focus-room-dialogue-settings" aria-labelledby="focus-room-events-title">
          <div class="focus-room-dialogue-settings__heading">
            <div>
              <h3 id="focus-room-events-title">이벤트별 대화</h3>
              <p>여러 대화를 선택하면 선택한 순서대로 연속 재생해요.</p>
            </div>
          </div>

          <div class="focus-room-dialogue-settings__library-heading">
            <h4 id="focus-room-dialogue-events-title">이벤트</h4>
            <span>{DIALOGUE_EVENTS.length}개</span>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class="focus-room-dialogue-settings__loading" role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              이벤트와 대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <ul
              aria-labelledby="focus-room-dialogue-events-title"
              class="focus-room-dialogue-settings__list"
            >
              <For each={DIALOGUE_EVENTS}>
                {(event) => {
                  const selectedDialogueIds = () =>
                    event.id === 'entry' ? events.entryDialogueIds() : []
                  const selectedDialogues = () =>
                    selectedDialogueIds().flatMap((dialogueId) => {
                      const dialogue = savedDialogues().find((item) => item.id === dialogueId)
                      return dialogue === undefined ? [] : [dialogue]
                    })

                  return (
                    <li
                      data-connected={selectedDialogues().length === 0 ? undefined : ''}
                      data-disabled={event.enabled ? undefined : ''}
                    >
                      <div class="focus-room-dialogue-settings__event-heading">
                        <span aria-hidden="true" class="focus-room-dialogue-settings__event-symbol">
                          <span class={`${event.icon} size-5`} />
                        </span>
                        <div>
                          <div>
                            <h5>{event.label}</h5>
                            <Show when={!event.enabled}>
                              <span>준비 중</span>
                            </Show>
                          </div>
                          <p>{event.description}</p>
                        </div>
                        <div class="focus-room-dialogue-settings__connection">
                          <span>대화 연결</span>
                          <DialogueConnectionMenu
                            dialogues={savedDialogues()}
                            disabled={!event.enabled || savedDialogues().length === 0}
                            onChange={(dialogueIds) => {
                              if (event.id === 'entry') {
                                handleEntryBinding(dialogueIds).catch((error: unknown) => {
                                  console.error('Unexpected entry binding failure.', error)
                                })
                              }
                            }}
                            selectedDialogueIds={selectedDialogueIds()}
                          />
                        </div>
                      </div>

                      <Show when={selectedDialogues().length > 0}>
                        <ol
                          aria-label={`${event.label} 대화 재생 순서`}
                          class="focus-room-dialogue-settings__sequence"
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
                        <p class="focus-room-dialogue-settings__unconnected">
                          {event.enabled
                            ? savedDialogues().length === 0
                              ? '대화 탭에서 먼저 대화를 만들어 주세요.'
                              : '연결된 대화가 없어요.'
                            : '이 이벤트는 아직 준비 중이에요.'}
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
              <p aria-live="polite" class="focus-room-dialogue-settings__message" role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>

      <Tabs.Content value="dialogue-library">
        <section
          class="focus-room-dialogue-settings"
          aria-labelledby="focus-room-dialogue-library-title"
        >
          <div class="focus-room-dialogue-settings__heading">
            <div>
              <h3 id="focus-room-dialogue-library-title">내 대화</h3>
              <p>저장된 대화를 듣거나 관리할 수 있어요.</p>
            </div>
            <A class="focus-room-dialogue-settings__create" href="/focus-room-dialogue">
              <span aria-hidden="true" class="i-tabler-plus size-4" />
              새 대화
            </A>
          </div>

          <div class="focus-room-dialogue-settings__library-heading">
            <h4 id="focus-room-dialogue-library-list-title">저장된 대화</h4>
            <span>{savedDialogues().length}개</span>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class="focus-room-dialogue-settings__loading" role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <Show
              when={savedDialogues().length > 0}
              fallback={
                <p class="focus-room-dialogue-settings__empty">
                  아직 저장된 대화가 없어요. 새 대화를 만들어 보세요.
                </p>
              }
            >
              <ul
                aria-labelledby="focus-room-dialogue-library-list-title"
                class="focus-room-dialogue-settings__list focus-room-dialogue-settings__list--library"
              >
                <For each={savedDialogues()}>
                  {(dialogue) => (
                    <li>
                      <div
                        class="focus-room-dialogue-settings__selected-dialogue
                          focus-room-dialogue-settings__selected-dialogue--library"
                      >
                        <div class="focus-room-dialogue-settings__summary">
                          <p title={dialogue.text}>{dialogue.text}</p>
                          <span>{getDialogueMetadata(dialogue)}</span>
                        </div>
                        <div class="focus-room-dialogue-settings__actions">
                          <DialoguePlaybackButton
                            isPlaying={playingDialogueId() === dialogue.id}
                            onPress={() => handlePlayback(dialogue)}
                          />
                          <A
                            href={`/focus-room-dialogue?dialogueId=${encodeURIComponent(dialogue.id)}`}
                          >
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
                              class="focus-room-dialogue-settings__delete-confirm"
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
              <p aria-live="polite" class="focus-room-dialogue-settings__message" role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>
    </>
  )
}
