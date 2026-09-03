import {cx} from 'class-variance-authority'
import {A} from '@solidjs/router'
import {createSignal, For, onCleanup, Show} from 'solid-js'

import {type PDialogue, usePEvents} from '../../features/focus-room-dialogue'
import * as m from '@paraglide/message'
import {DialogueLibraryItem, type DialogueLibraryItemProps} from './LibraryItem'
import {DialoguePlaybackButton} from './PlaybackButton'

const CLASSES = {
  audio: 'pomo-dialogue-settings__audio hidden',
  list: cx(
    'pomo-dialogue-settings__list pomo-dialogue-settings__list--library',
    'm-0 grid list-none gap-3 p-0 settings-compact:gap-2',
  ),
  message: cx(
    'pomo-dialogue-settings__message m-0 rounded-panel',
    'bg-content-surface p-5 text-muted-foreground text-xs settings-compact:p-4',
    'leading-[1.5] text-center',
  ),
} as const

export interface DialogueLibraryEntry {
  readonly dialogue: PDialogue
  readonly metadata?: string
}

export interface DialogueLibraryProps {
  readonly entries: ReadonlyArray<DialogueLibraryEntry>
  readonly onAfterDelete?: (dialogue: PDialogue) => void
  readonly onRequestClose?: () => void
  readonly textLineLimit?: DialogueLibraryItemProps['lineLimit']
}

// oxlint-disable-next-line eslint/max-lines-per-function -- Owns one shared audio and deletion lifecycle for all library rows.
export const DialogueLibrary = (props: DialogueLibraryProps) => {
  const events = usePEvents()
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
        setMessage(m.settings_dialogue_audio_missing())
        return
      }

      const player = audioElement()

      if (player === undefined) {
        setMessage(m.settings_dialogue_player_failed())
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
      setMessage(m.settings_dialogue_playback_failed())
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

  const handleDelete = async (dialogue: PDialogue) => {
    try {
      stopPlayback()
      await events.deleteDialogue(dialogue.id)
      props.onAfterDelete?.(dialogue)
      setPendingDeleteId(null)
    } catch (error: unknown) {
      console.error('Failed to delete focus room dialogue.', error)
      setMessage(m.settings_dialogue_delete_failed())
    }
  }

  return (
    <>
      <audio class={CLASSES.audio} onEnded={stopPlayback} preload="none" ref={setAudioElement} />
      <ul aria-label={m.settings_dialogue_saved_list()} class={CLASSES.list}>
        <For each={props.entries}>
          {(entry) => (
            <DialogueLibraryItem
              actions={
                <>
                  <DialoguePlaybackButton
                    isPlaying={playingDialogueId() === entry.dialogue.id}
                    onPress={() => handlePlayback(entry.dialogue)}
                  />
                  <button onClick={() => handleCharacterPlayback(entry.dialogue)} type="button">
                    <span aria-hidden="true" class="i-tabler-message-circle size-4" />
                    {m.settings_dialogue_character_listen()}
                  </button>
                  <A href={`/dialogue?dialogueId=${encodeURIComponent(entry.dialogue.id)}`}>
                    <span aria-hidden="true" class="i-tabler-pencil size-4" />
                    {m.settings_dialogue_edit()}
                  </A>
                  <Show
                    when={pendingDeleteId() === entry.dialogue.id}
                    fallback={
                      <button onClick={() => setPendingDeleteId(entry.dialogue.id)} type="button">
                        {m.settings_dialogue_delete()}
                      </button>
                    }
                  >
                    <button onClick={() => setPendingDeleteId(null)} type="button">
                      {m.settings_dialogue_cancel()}
                    </button>
                    <button
                      class="pomo-dialogue-settings__delete-confirm"
                      data-pomo-dialogue-delete-confirm=""
                      onClick={() => handleDelete(entry.dialogue)}
                      type="button"
                    >
                      {m.settings_dialogue_delete_confirm()}
                    </button>
                  </Show>
                </>
              }
              metadata={entry.metadata}
              text={entry.dialogue.text}
              lineLimit={props.textLineLimit}
            />
          )}
        </For>
      </ul>
      <Show when={message() ?? events.errorMessage()}>
        {(currentMessage) => (
          <p aria-live="polite" class={CLASSES.message} role="status">
            {currentMessage()}
          </p>
        )}
      </Show>
    </>
  )
}
