import {createMemo, createSignal, createUniqueId, For, type JSX, Show} from 'solid-js'
import {
  SPEECH_LIMIT,
  speechPresets,
  type SpeechStatus,
  type useCharacterSpeech,
} from '../features/character-speech'
import {SIcon} from './SIcon'

interface SSpeechMenuProps {
  readonly speech: ReturnType<typeof useCharacterSpeech>
  readonly ready: boolean
}

const handleToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
  if (event.newState === 'open') {
    event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus()
  }
}

const speechProgress = (state: SpeechStatus) => {
  switch (state.phase) {
    case 'preparing':
      return '대사 불러오는 중…'
    case 'downloading':
      return `음성 모델 받는 중 ${state.percent}%`
    case 'generating':
      return '목소리 만드는 중…'
    case 'playing':
      return '말하는 중'
    case 'idle':
      return null
    case 'error':
      return null
    default: {
      const unexpected: never = state
      return unexpected
    }
  }
}

export const SSpeechMenu = (props: SSpeechMenuProps) => {
  const menuId = `speech-${createUniqueId()}`
  const [text, setText] = createSignal('')
  const valid = createMemo(() => text().trim().length > 0 && text().length <= SPEECH_LIMIT)
  const progress = createMemo(() => speechProgress(props.speech.status()))
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault()
    if (valid() && props.ready && !props.speech.busy()) {
      props.speech.speak(text())
    }
  }
  return (
    <>
      <button
        type="button"
        popovertarget={menuId}
        aria-label="대사 선택"
        aria-haspopup="dialog"
        title="대사"
        class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
          rounded-full border-0 bg-transparent hover:bg-lilac"
        classList={{'bg-lilac! text-violet': props.speech.busy()}}
      >
        <SIcon name="speech" />
      </button>
      <div
        id={menuId}
        popover="auto"
        role="dialog"
        aria-label="말하기"
        onToggle={handleToggle}
        class="fixed left-1/2 right-auto top-auto bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))_+_4.5rem)]
        m-0 max-h-[calc(100dvh-8rem)] w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto
        overscroll-contain rounded-5 border border-solid border-white/80 bg-white/95 p-3 text-ink
        shadow-[0_12px_40px_-12px_#35244745] backdrop-blur-xl"
      >
        <div class="flex flex-col gap-1">
          <For each={speechPresets}>
            {(preset) => (
              <button
                type="button"
                title={preset.text}
                disabled={!props.ready || props.speech.busy()}
                onClick={() => props.speech.speak(preset.text)}
                class="flex min-h-10 min-w-0 w-full items-center justify-between gap-3 rounded-2 border-0 bg-transparent
                  px-3 py-2 text-left text-xs hover:bg-lilac disabled:opacity-40"
              >
                <span class="min-w-0 flex-1 truncate">{preset.text}</span>
                <SIcon name="play" class="h-4 w-4" />
              </button>
            )}
          </For>
        </div>
        <form
          onSubmit={handleSubmit}
          class="mt-3 border-0 border-t border-solid border-ink/10 pt-3"
        >
          <label for={`${menuId}-text`} class="mb-2 block px-1 text-[11px] font-600 text-muted">
            직접 입력
          </label>
          <textarea
            id={`${menuId}-text`}
            value={text()}
            onInput={(event) => setText(event.currentTarget.value)}
            maxLength={SPEECH_LIMIT}
            rows={3}
            placeholder="듣고 싶은 대사를 적어 주세요"
            class="block w-full resize-none rounded-3 border border-solid border-ink/10
              bg-lilac/35 p-3 text-xs leading-6
              text-ink font-inherit placeholder:text-muted focus-visible:outline-offset-2"
          />
          <div class="mt-2 flex items-center justify-between gap-3">
            <span class="px-1 text-[10px] text-muted">
              {text().length}/{SPEECH_LIMIT}
            </span>
            <Show
              when={props.speech.busy()}
              fallback={
                <button
                  type="submit"
                  disabled={!props.ready || !valid()}
                  class="flex min-h-9 items-center gap-2 rounded-full border-0 bg-ink px-4 text-xs
                    text-white hover:bg-violet disabled:opacity-35"
                >
                  <SIcon name="play" class="h-4 w-4" />
                  말하기
                </button>
              }
            >
              <button
                type="button"
                onClick={() => props.speech.stop()}
                class="flex min-h-9 items-center gap-2 rounded-full border-0 bg-ink px-4
                  text-xs text-white hover:bg-violet"
              >
                <SIcon name="stop" class="h-4 w-4" />
                정지
              </button>
            </Show>
          </div>
        </form>
        <Show when={progress()}>
          {(message) => (
            <p role="status" class="mt-3 px-1 text-[11px] text-muted">
              {message()}
            </p>
          )}
        </Show>
        <Show when={!props.ready}>
          <p role="status" class="mt-3 px-1 text-[11px] text-muted">
            캐릭터를 불러오는 중…
          </p>
        </Show>
        <Show when={props.speech.status().phase === 'error'}>
          <p role="alert" class="mt-3 px-1 text-[11px] text-ink">
            대사를 재생하지 못했어요. 다시 눌러 주세요.
          </p>
        </Show>
        <Show when={props.speech.cacheUnavailable()}>
          <p role="status" class="mt-3 px-1 text-[11px] text-muted">
            이번 대사는 기기에 저장하지 못했어요.
          </p>
        </Show>
        <a
          href="/licenses/speech.txt"
          target="_blank"
          rel="noreferrer"
          class="mt-3 block px-1 text-[10px] text-muted underline underline-offset-2"
        >
          Supertonic 3 · INT8
        </a>
      </div>
    </>
  )
}
