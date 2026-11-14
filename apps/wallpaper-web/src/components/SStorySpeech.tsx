import type {useCharacterSpeech} from '../features/character-speech'
import {SIcon} from './SIcon'

interface SStorySpeechProps {
  readonly speech: ReturnType<typeof useCharacterSpeech>
  readonly disabled?: boolean
  readonly text: string
}

export const SStorySpeech = (props: SStorySpeechProps) => {
  const label = () => (props.speech.busy() ? '소개 음성 멈추기' : '소개 음성 듣기')
  const handlePlayback = () => {
    if (props.speech.busy()) {
      props.speech.stop()
    } else {
      props.speech.speak(props.text)
    }
  }
  return (
    <button
      type="button"
      aria-label={label()}
      title={label()}
      onClick={handlePlayback}
      disabled={props.disabled}
      class="pointer-events-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full
        border-0 bg-white/65 text-violet hover:bg-lilac disabled:opacity-50"
    >
      <SIcon name={props.speech.busy() ? 'stop' : 'volume'} class="h-4 w-4" />
    </button>
  )
}
