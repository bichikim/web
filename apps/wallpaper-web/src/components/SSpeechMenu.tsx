import {createMemo, createUniqueId, For, type JSX, Show} from 'solid-js'
import {
  speechPresets,
  type SpeechStatus,
  type useCharacterSpeech,
} from '../features/character-speech'
import {SIcon} from './SIcon'
import {SSpeechComposer} from './SSpeechComposer'

interface SSpeechMenuProps {
  readonly speech: ReturnType<typeof useCharacterSpeech>
  readonly ready: boolean
}

const handleToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
  if (event.newState === 'open') {
    event.currentTarget.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
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
  const progress = createMemo(() => speechProgress(props.speech.status()))
  const handleStop: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const menu = event.currentTarget.closest('[popover]')
    props.speech.stop()
    menu?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
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
        <div class="max-h-32 flex flex-col gap-1 overflow-y-auto overscroll-contain">
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
        <Show when={progress()}>
          {(message) => (
            <div class="mt-3 flex items-center justify-between gap-3 px-1">
              <p role="status" class="text-[11px] text-muted">
                {message()}
              </p>
              <button
                type="button"
                onClick={handleStop}
                class="flex min-h-9 shrink-0 items-center gap-2 rounded-full border-0 bg-ink px-4 text-xs
                  text-white hover:bg-violet"
              >
                <SIcon name="stop" class="h-4 w-4" />
                정지
              </button>
            </div>
          )}
        </Show>
        <SSpeechComposer ready={props.ready} speech={props.speech} />
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
