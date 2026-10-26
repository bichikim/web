import {Show} from 'solid-js'
import type {VoiceStatus} from '../features/voice/readout'

interface SSpeechVoiceActivityProps {
  readonly state?: VoiceStatus
}

export const SSpeechVoiceActivity = (props: SSpeechVoiceActivityProps) => {
  const voiceLabel = () =>
    ({
      buffering: '말풍선 읽는 중 · 다음 음성 생성 중',
      download: '음성 모델 준비 중',
      generating: '음성 생성 중',
      idle: undefined,
      playing: '말풍선 읽는 중',
    })[props.state ?? 'idle']
  const preparing = () =>
    props.state === 'buffering' || props.state === 'download' || props.state === 'generating'
  return (
    <Show when={voiceLabel()}>
      {(state) => (
        <span
          role="img"
          aria-label={state()}
          aria-busy={preparing()}
          title={state()}
          class="pointer-events-none grid h-3.5 w-3.5 shrink-0 place-items-center text-blue-700"
        >
          <Show
            when={preparing()}
            fallback={
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-3.5 w-3.5 fill-none stroke-current stroke-2"
              >
                <path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
              </svg>
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5 animate-spin fill-none stroke-current stroke-[3] motion-reduce:animate-none"
            >
              <circle cx="12" cy="12" r="9" class="opacity-25" />
              <path d="M12 3a9 9 0 0 1 9 9" class="[stroke-linecap:round]" />
            </svg>
          </Show>
        </span>
      )}
    </Show>
  )
}
