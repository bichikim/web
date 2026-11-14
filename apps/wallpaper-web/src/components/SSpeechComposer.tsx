import {createMemo, createSignal, createUniqueId, type JSX} from 'solid-js'
import {SPEECH_LIMIT} from '../features/character-speech'
import {SIcon} from './SIcon'

interface SpeechComposerControls {
  readonly busy: () => boolean
  readonly speak: (text: string) => void
}

interface SSpeechComposerProps {
  /** Playback state and submission capability used by this composer. */
  readonly speech: SpeechComposerControls
  /** Omitted disables submission while preserving draft editing and folding. */
  readonly ready?: boolean
}

export const SSpeechComposer = (props: SSpeechComposerProps) => {
  const id = `speech-composer-${createUniqueId()}`
  const [expanded, setExpanded] = createSignal(false)
  const [text, setText] = createSignal('')
  const valid = createMemo(() => text().trim().length > 0 && text().length <= SPEECH_LIMIT)
  const handleToggle = () => setExpanded((current) => !current)
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault()
    if (valid() && props.ready && !props.speech.busy()) {
      props.speech.speak(text())
    }
  }
  return (
    <section
      aria-labelledby={`${id}-heading`}
      class="mt-3 rounded-4 border border-solid border-ink/8 bg-lilac/45"
    >
      <button
        id={`${id}-heading`}
        type="button"
        aria-expanded={expanded()}
        aria-controls={`${id}-content`}
        onClick={handleToggle}
        class="flex min-h-11 w-full items-center justify-between gap-3 rounded-4
          border-0 border-b border-solid border-transparent bg-transparent px-3 text-xs font-600 text-ink
          transition-colors hover:bg-lilac/70 focus-visible:outline-2 focus-visible:outline-offset-2
          [&[aria-expanded=true]>svg]:-rotate-90"
        classList={{'rounded-b-0 border-ink/8!': expanded()}}
      >
        직접 입력
        <SIcon
          name="chevron"
          class="h-4 w-4 rotate-90 text-muted transition-transform duration-200"
        />
      </button>
      <div
        id={`${id}-content`}
        inert={!expanded()}
        aria-hidden={!expanded()}
        class="speech-composer grid grid-rows-[0fr] opacity-0"
        classList={{'grid-rows-[1fr]! opacity-100!': expanded()}}
      >
        <div class="min-h-0 overflow-hidden">
          <form onSubmit={handleSubmit} class="p-3">
            <label for={`${id}-text`} class="sr-only">
              직접 입력
            </label>
            <textarea
              id={`${id}-text`}
              value={text()}
              onInput={(event) => setText(event.currentTarget.value)}
              maxLength={SPEECH_LIMIT}
              rows={3}
              placeholder="듣고 싶은 대사를 적어 주세요"
              class="block w-full resize-none rounded-3 border border-solid border-ink/10
                bg-white/85 p-3 text-xs leading-6 text-ink font-inherit placeholder:text-muted
                focus-visible:outline-offset-2"
            />
            <div class="mt-2 flex items-center justify-between gap-3">
              <span class="px-1 text-[10px] text-muted">
                {text().length}/{SPEECH_LIMIT}
              </span>
              <button
                type="submit"
                disabled={!props.ready || !valid() || props.speech.busy()}
                class="flex min-h-9 items-center gap-2 rounded-full border-0 bg-ink px-4 text-xs
                  text-white hover:bg-violet disabled:opacity-35"
              >
                <SIcon name="play" class="h-4 w-4" />
                말하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
