import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type SupertonicVoiceLabState} from '../../features/supertonic/index'

const BUTTON_CLASSES = cx(
  'h-13 rounded-full bg-#f2a7b8 px-7 font-750 text-#2d1723',
  'shadow-[0_10px_28px_rgba(242,167,184,0.22)] transition hover:bg-#ffc0ce',
  'disabled:cursor-not-allowed disabled:opacity-35',
)

type GenerationStatus = SupertonicVoiceLabState['status']

interface VoiceActionsProps {
  readonly canGenerate: boolean
  readonly canPrepare: boolean
  readonly errorMessage: string | null
  readonly isModelReady: boolean
  readonly onGenerate: () => void
  readonly onPrepare: () => void
  readonly progress: number
  readonly status: GenerationStatus
}

export const VoiceActions = (props: VoiceActionsProps) => (
  <div class="grid justify-items-end gap-2">
    <button
      class={BUTTON_CLASSES}
      disabled={props.isModelReady ? !props.canGenerate : !props.canPrepare}
      onClick={() => (props.isModelReady ? props.onGenerate() : props.onPrepare())}
      type="button"
    >
      {props.status === 'preparing'
        ? `모델 준비 중… ${props.progress}%`
        : props.status === 'generating'
          ? '음성 만드는 중…'
          : props.isModelReady
            ? '음성 만들기'
            : 'Supertonic 준비하기'}
    </button>
    <Show when={props.errorMessage}>
      {(message) => (
        <p aria-live="polite" class="m-0 text-right text-xs text-#ff9aa8" role="alert">
          {message()}
        </p>
      )}
    </Show>
  </div>
)
