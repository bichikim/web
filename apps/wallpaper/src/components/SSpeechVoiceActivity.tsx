import {text as uiText} from '../features/localization'
import {Match, Show, Switch} from 'solid-js'
import type {VoiceStatus} from '../features/voice/readout'

interface SSpeechVoiceActivityProps {
  readonly state?: VoiceStatus
  readonly onToggle?: () => void
}

export const SSpeechVoiceActivity = (props: SSpeechVoiceActivityProps) => {
  const active = () =>
    props.state !== undefined && props.state !== 'idle' && props.state !== 'paused'
  const label = () => (active() ? uiText('음성 일시정지') : uiText('음성 재생'))
  const preparing = () =>
    props.state === 'buffering' || props.state === 'download' || props.state === 'generating'
  return (
    <Show when={props.onToggle}>
      {(toggle) => (
        <button
          type="button"
          aria-label={label()}
          aria-busy={preparing()}
          aria-description={preparing() ? uiText('음성 준비 중') : undefined}
          title={preparing() ? uiText('음성 준비 중 · 일시정지') : label()}
          onClick={toggle()}
          class="wallpaper-speech-action"
          classList={{
            'text-blue-700': active(),
            'text-stone-600': !active(),
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-4 w-4 fill-none stroke-current [stroke-width:1.75]
            [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <Switch fallback={<path d="m8 5 11 7-11 7V5Z" />}>
              <Match when={preparing()}>
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  class="origin-center animate-spin [stroke-dasharray:32_20] motion-reduce:animate-none"
                />
              </Match>
              <Match when={active()}>
                <path d="M8 5v14M16 5v14" />
              </Match>
            </Switch>
          </svg>
        </button>
      )}
    </Show>
  )
}
