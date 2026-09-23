import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import * as m from '@paraglide/message'

const WORD_ACTION_BUTTON_CLASS = cx(
  'inline-flex min-h-7 w-9 flex-none cursor-pointer self-stretch items-center justify-center border-0',
  'border-solid border-border bg-transparent',
  'disabled:cursor-not-allowed disabled:opacity-40',
)

interface LanguageLearningWordPronunciationButtonProps {
  readonly autoplay: boolean
  readonly disabled: boolean
  readonly loading: boolean
  readonly onPress: () => void
  readonly src: string | null
  readonly word: string
}

export const LanguageLearningWordPronunciationButton = (
  props: LanguageLearningWordPronunciationButtonProps,
) => {
  const [audio, setAudio] = createSignal<HTMLAudioElement>()
  const [playbackFailed, setPlaybackFailed] = createSignal(false)
  let playRevision = 0

  const play = () => {
    const element = audio()
    if (element === undefined) {
      return
    }

    element.currentTime = 0
    playRevision += 1
    const currentRevision = playRevision
    setPlaybackFailed(false)
    element.play().then(
      () => {
        if (playRevision === currentRevision) {
          setPlaybackFailed(false)
        }
      },
      () => {
        if (playRevision === currentRevision) {
          setPlaybackFailed(true)
        }
      },
    )
  }

  createEffect(() => {
    const shouldAutoplay = props.autoplay
    if (shouldAutoplay && untrack(() => props.src) !== null) {
      play()
    }
  })

  onCleanup(() => audio()?.pause())

  const accessibleLabel = () => {
    if (props.loading) {
      return m.learning_words_pronouncing({word: props.word})
    }
    if (playbackFailed()) {
      return m.learning_words_playback_failed({word: props.word})
    }
    return m.learning_words_pronounce({word: props.word})
  }

  const iconClass = () => {
    if (props.loading) {
      return 'i-tabler-loader-2 size-3.5 animate-spin'
    }
    return playbackFailed()
      ? 'i-tabler-alert-circle size-3.5 text-[#f2a398]'
      : 'i-tabler-volume-2 size-3.5'
  }

  return (
    <>
      <button
        aria-busy={props.loading}
        aria-label={accessibleLabel()}
        class={`${WORD_ACTION_BUTTON_CLASS} border-l text-muted-foreground hover:text-foreground`}
        disabled={props.disabled}
        onClick={() => props.onPress()}
        title={accessibleLabel()}
        type="button"
      >
        <span aria-hidden="true" class={iconClass()} />
      </button>
      <audio
        aria-hidden="true"
        class="hidden"
        preload="auto"
        ref={setAudio}
        src={props.src ?? undefined}
      />
    </>
  )
}
