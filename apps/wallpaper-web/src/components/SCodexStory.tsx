import {createMemo, Show} from 'solid-js'
import type {useCharacterSpeech} from '../features/character-speech'
import demo from '../data/codex-demo.json'
import {SIcon} from './SIcon'

interface SCodexStoryProps {
  readonly speech?: ReturnType<typeof useCharacterSpeech>
  readonly ready?: boolean
  readonly playing?: boolean
}

export const SCodexStory = (props: SCodexStoryProps) => {
  const busy = createMemo(() => props.speech?.busy() === true)
  const failed = createMemo(() => props.speech?.status().phase === 'error')
  const handlePlayback = () => {
    if (busy()) {
      props.speech?.stop()
    } else {
      props.speech?.speak(demo.text)
    }
  }
  return (
    <aside
      aria-label="Codex 연결 예시"
      class="absolute bottom-[13%] left-[6%] w-[62%] max-w-88 -rotate-2 text-ink
        sm:bottom-[16%] sm:left-[32%] sm:w-[29%]"
    >
      <div
        class="relative rounded-[1.2rem] bg-white/95 p-4
          shadow-[0_16px_60px_-18px_#372c6555] backdrop-blur-xl sm:p-5"
      >
        <div class="flex items-center gap-2 text-[10px] font-650 sm:text-xs">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-lg bg-ink text-white"
            aria-hidden="true"
          >
            ↗
          </span>
          <span>Codex</span>
          <span class="ml-auto text-[9px] font-500 text-muted">연결 예시</span>
        </div>
        <p class="mt-3 text-[10px] font-600 text-violet sm:text-xs">작업 완료</p>
        <p class="mt-1.5 break-keep text-[11px] leading-5 sm:text-sm sm:leading-6">{demo.text}</p>
        <button
          type="button"
          onClick={handlePlayback}
          disabled={!props.ready || !props.playing || props.speech === undefined}
          class="pointer-events-auto mt-3 flex min-h-11 items-center gap-2 rounded-full border-0 bg-lilac px-3
            text-[10px]
            font-650 text-violet hover:bg-violet hover:text-white disabled:cursor-wait disabled:opacity-50 sm:text-xs"
        >
          <SIcon name={busy() ? 'stop' : 'play'} class="h-4 w-4" />
          {busy() ? '멈추기' : failed() ? '다시 듣기' : '목소리 듣기'}
        </button>
        <Show when={failed()}>
          <p role="status" class="mt-2 text-[10px] text-muted">
            재생하지 못했어요. 다시 눌러 주세요.
          </p>
        </Show>
        <span
          aria-hidden="true"
          class="absolute -right-2 bottom-8 h-6 w-6 rotate-45 rounded-sm bg-white/95"
        />
      </div>
    </aside>
  )
}
