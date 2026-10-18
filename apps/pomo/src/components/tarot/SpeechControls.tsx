import * as m from '@paraglide/message'
import {cx} from 'class-variance-authority'
import {type Accessor, onCleanup, Show} from 'solid-js'
import type {TarotSpeechController} from '../../features/tarot'
import {AudioPlayer} from '../audio-player'
import {PlaybackIcon} from '../audio-preview/PlaybackIcon'

const PLAY_CLASSES = cx(
  'grid size-9 box-border shrink-0 cursor-pointer place-items-center rounded-full border border-solid p-0',
  'border-[#d8b97e60] bg-[#10271f] text-[#d8b97e] outline-none',
  'hover:bg-[#263b30] focus-visible:shadow-focus disabled:cursor-default disabled:opacity-100',
)

export interface SpeechControlsProps {
  readonly class?: string
  readonly generating?: boolean
  readonly speech: TarotSpeechController
}

export const SpeechControls = (props: SpeechControlsProps) => {
  const handleCleanup = () => {
    props.speech.onPlaybackEnd()
  }
  onCleanup(handleCleanup)
  const isBusy = () =>
    props.generating ||
    props.speech.status() === 'downloading' ||
    props.speech.status() === 'preparing'
  const loadingLabel = () => (props.generating ? m.tarot_generating() : m.tarot_voice_preparing())
  const handleSource = (source: Accessor<string>) => (
    <AudioPlayer.Root
      autoplay={props.speech.autoplay()}
      paused={props.speech.paused()}
      onBeforePlayback={props.speech.onPlaybackRequest}
      onPlayError={props.speech.onPlaybackError}
    >
      <AudioPlayer.Media
        class="hidden"
        src={source()}
        preload="auto"
        onPlay={props.speech.onPlaybackStart}
        onEnded={props.speech.onPlaybackEnd}
        onPause={props.speech.onPlaybackEnd}
        onError={props.speech.onPlaybackError}
      />
      <AudioPlayer.PlayButton
        class={PLAY_CLASSES}
        playLabel={m.tarot_voice_play()}
        pauseLabel={m.tarot_voice_pause()}
      >
        <PlaybackIcon />
      </AudioPlayer.PlayButton>
    </AudioPlayer.Root>
  )

  return (
    <div class="min-w-0 grid justify-items-end gap-2 text-[#d8b97e]">
      <div
        class={cx('flex min-w-0 items-center justify-end gap-3', props.class)}
        aria-busy={isBusy()}
      >
        <Show
          when={!isBusy() && props.speech.audioUrl()}
          fallback={
            <button
              aria-label={isBusy() ? loadingLabel() : m.tarot_voice_play()}
              class={PLAY_CLASSES}
              disabled={isBusy() || props.speech.status() === 'consent'}
              onClick={props.speech.request}
              type="button"
            >
              <span
                aria-hidden="true"
                class={cx(
                  'size-4.5',
                  isBusy()
                    ? 'i-tabler-loader-2 animate-spin motion-reduce:animate-none'
                    : 'i-tabler-player-play',
                )}
              />
            </button>
          }
        >
          {handleSource}
        </Show>
      </div>
      <Show when={props.speech.error()}>
        <p role="alert" class="m-0 max-w-64 text-xs leading-5 text-danger">
          {props.speech.error()}
        </p>
      </Show>
    </div>
  )
}
