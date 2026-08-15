import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {createMemo, createSignal, For, onCleanup, onMount, Show} from 'solid-js'

import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  type AutomaticDialogueSettingsRepository,
  createAutomaticDialogueSettingsRepository,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../features/focus-room-dialogue'
import {usePEvents} from '../features/focus-room-dialogue/PEventContext'
import type {DialogueEventId, PDialogue} from '../features/focus-room-dialogue/schema'
import {excludeFeedDialogues, usePFeedContext} from '../features/focus-room-feed'
import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../features/supertonic'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MODEL_OPTIONS: ReadonlyArray<PSelectOption<SupertonicModelId>> = SUPERTONIC_MODELS.map(
  (model) => ({
    label: `${model.label} · ${model.description}`,
    value: model.id,
  }),
)
const VOICE_OPTIONS: ReadonlyArray<PSelectOption<SupertonicVoiceId>> = SUPERTONIC_VOICES.map(
  (voice) => ({label: voice.label, value: voice.id}),
)

interface DialogueEventDefinition {
  readonly description: string
  readonly icon: string
  readonly id: DialogueEventId
  readonly label: string
}

const DIALOGUE_EVENTS: ReadonlyArray<DialogueEventDefinition> = [
  {
    description: '집중룸을 열 때 한 번 재생',
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

interface DialogueConnectionMenuProps {
  readonly dialogues: ReadonlyArray<PDialogue>
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
        class="pomo-dialogue-settings__dialogue-trigger"
        disabled={props.disabled}
      >
        <span
          class="pomo-dialogue-settings__dialogue-trigger-text"
          title={selectedDialogues()
            .map((dialogue) => dialogue.text)
            .join('\n')}
        >
          {triggerLabel()}
        </span>
        <DropdownMenu.Icon class="pomo-dialogue-settings__dialogue-icon">
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </DropdownMenu.Icon>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="pomo-backdrop pomo-dialogue-settings__dialogue-menu">
          <DropdownMenu.Item
            class="pomo-dialogue-settings__dialogue-item pomo-dialogue-settings__dialogue-item--clear"
            disabled={props.selectedDialogueIds.length === 0}
            onSelect={() => props.onChange([])}
          >
            <span aria-hidden="true" class="i-tabler-unlink size-4" />
            <span class="pomo-dialogue-settings__dialogue-item-text">
              <strong>모두 연결 해제</strong>
            </span>
          </DropdownMenu.Item>
          <For each={props.dialogues}>
            {(dialogue) => (
              <DropdownMenu.CheckboxItem
                checked={props.selectedDialogueIds.includes(dialogue.id)}
                class="pomo-dialogue-settings__dialogue-item"
                onChange={(isChecked) => toggleDialogue(dialogue.id, isChecked)}
              >
                <DropdownMenu.ItemIndicator
                  class="pomo-dialogue-settings__dialogue-indicator"
                  forceMount
                >
                  <span aria-hidden="true" class="i-tabler-check size-3.5" />
                </DropdownMenu.ItemIndicator>
                <span class="pomo-dialogue-settings__dialogue-item-text">
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

const AutomaticDialogueSettings = () => {
  const [settings, setSettings] = createSignal(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let repository: AutomaticDialogueSettingsRepository | null = null

  onMount(() => {
    try {
      const nextRepository = createAutomaticDialogueSettingsRepository(window.localStorage)
      repository = nextRepository
      setSettings(nextRepository.load())
    } catch (error: unknown) {
      console.error('Failed to load automatic dialogue settings.', error)
      setMessage('자동 음성 생성 설정을 불러오지 못했어요.')
    } finally {
      setIsLoading(false)
    }
  })

  const saveSettings = (nextSettings: typeof DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS) => {
    const currentRepository = repository

    if (currentRepository === null) {
      setMessage('자동 음성 생성 설정이 아직 준비되지 않았어요.')
      return
    }

    try {
      currentRepository.save(nextSettings)
      setSettings(nextSettings)
      setMessage('자동 음성 생성 설정을 저장했어요.')
      window.dispatchEvent(new CustomEvent(AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT))
    } catch (error: unknown) {
      console.error('Failed to save automatic dialogue settings.', error)
      setMessage('자동 음성 생성 설정을 저장하지 못했어요.')
    }
  }

  return (
    <section
      aria-labelledby="pomo-automatic-dialogue-title"
      class="pomo-dialogue-settings__automatic"
    >
      <div>
        <h4 id="pomo-automatic-dialogue-title">자동 음성 생성</h4>
        <p>모든 자동 음성 생성에 사용할 모델과 음성 기본값이에요.</p>
      </div>
      <Show
        when={!isLoading()}
        fallback={<p class="pomo-dialogue-settings__automatic-loading">설정 불러오는 중</p>}
      >
        <div class="pomo-dialogue-settings__automatic-controls">
          <PSelect
            accessibleLabel="자동 음성 생성 모델"
            label="음성 모델"
            onChange={(modelId) => saveSettings({...settings(), modelId})}
            options={MODEL_OPTIONS}
            value={settings().modelId}
          />
          <PSelect
            accessibleLabel="자동 음성 생성 목소리"
            label="목소리"
            onChange={(voiceId) => saveSettings({...settings(), voiceId})}
            options={VOICE_OPTIONS}
            value={settings().voiceId}
          />
        </div>
      </Show>
      <Show when={message()}>
        {(currentMessage) => (
          <p aria-live="polite" class="pomo-dialogue-settings__automatic-message" role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </section>
  )
}

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
        class="pomo-dialogue-settings__audio"
        onEnded={stopPlayback}
        preload="none"
        ref={setAudioElement}
      />
      <Tabs.Content value="events">
        <section class="pomo-dialogue-settings" aria-labelledby="pomo-events-title">
          <div class="pomo-dialogue-settings__heading">
            <div>
              <h3 id="pomo-events-title">이벤트별 대화</h3>
              <p>여러 대화를 선택하면 선택한 순서대로 연속 재생해요.</p>
            </div>
          </div>

          <div class="pomo-dialogue-settings__library-heading">
            <h4 id="pomo-dialogue-events-title">이벤트</h4>
            <span>{DIALOGUE_EVENTS.length}개</span>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class="pomo-dialogue-settings__loading" role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              이벤트와 대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <ul aria-labelledby="pomo-dialogue-events-title" class="pomo-dialogue-settings__list">
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
                      <div class="pomo-dialogue-settings__event-heading">
                        <span aria-hidden="true" class="pomo-dialogue-settings__event-symbol">
                          <span class={`${event.icon} size-5`} />
                        </span>
                        <div>
                          <div>
                            <h5>{event.label}</h5>
                          </div>
                          <p>{event.description}</p>
                        </div>
                        <div class="pomo-dialogue-settings__connection">
                          <span>대화 연결</span>
                          <DialogueConnectionMenu
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
                          class="pomo-dialogue-settings__sequence"
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
                        <p class="pomo-dialogue-settings__unconnected">
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
              <p aria-live="polite" class="pomo-dialogue-settings__message" role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>

      <Tabs.Content value="dialogue-library">
        <section class="pomo-dialogue-settings" aria-labelledby="pomo-dialogue-library-title">
          <div class="pomo-dialogue-settings__heading">
            <div>
              <h3 id="pomo-dialogue-library-title">내 대화</h3>
              <p>저장된 대화를 듣거나 관리할 수 있어요.</p>
            </div>
            <A class="pomo-dialogue-settings__create" href="/focus-room-dialogue">
              <span aria-hidden="true" class="i-tabler-plus size-4" />
              새 대화
            </A>
          </div>

          <AutomaticDialogueSettings />

          <div class="pomo-dialogue-settings__library-heading">
            <h4 id="pomo-dialogue-library-list-title">저장된 대화</h4>
            <span>{savedDialogues().length}개</span>
          </div>

          <Show when={events.isLoading()}>
            <div aria-live="polite" class="pomo-dialogue-settings__loading" role="status">
              <span aria-hidden="true" class="i-tabler-loader-2 size-5" />
              대화를 불러오는 중
            </div>
          </Show>

          <Show when={!events.isLoading()}>
            <Show
              when={savedDialogues().length > 0}
              fallback={
                <p class="pomo-dialogue-settings__empty">
                  아직 저장된 대화가 없어요. 새 대화를 만들어 보세요.
                </p>
              }
            >
              <ul
                aria-labelledby="pomo-dialogue-library-list-title"
                class="pomo-dialogue-settings__list pomo-dialogue-settings__list--library"
              >
                <For each={savedDialogues()}>
                  {(dialogue) => (
                    <li>
                      <div
                        class="pomo-dialogue-settings__selected-dialogue
                          pomo-dialogue-settings__selected-dialogue--library"
                      >
                        <div class="pomo-dialogue-settings__summary">
                          <p title={dialogue.text}>{dialogue.text}</p>
                          <span>{getDialogueMetadata(dialogue)}</span>
                        </div>
                        <div class="pomo-dialogue-settings__actions">
                          <DialoguePlaybackButton
                            isPlaying={playingDialogueId() === dialogue.id}
                            onPress={() => handlePlayback(dialogue)}
                          />
                          <button onClick={() => handleCharacterPlayback(dialogue)} type="button">
                            <span aria-hidden="true" class="i-tabler-message-circle size-4" />
                            캐릭터로 듣기
                          </button>
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
                              class="pomo-dialogue-settings__delete-confirm"
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
              <p aria-live="polite" class="pomo-dialogue-settings__message" role="status">
                {currentMessage()}
              </p>
            )}
          </Show>
        </section>
      </Tabs.Content>
    </>
  )
}
