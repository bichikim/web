import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {PProgress} from './PProgress'

const STATUS_CLASSES = cx(
  'pomo-generation-status flex min-h-12 box-border items-center gap-[0.65rem] rounded-xl',
  'bg-primary-soft p-3 text-foreground text-[0.8rem] leading-[1.4]',
  '[&_strong]:text-highlight',
)
const CANCEL_CLASSES = cx(
  'min-h-8 cursor-pointer border border-solid border-highlight rounded-full bg-transparent px-3',
  'text-foreground text-xs font-[750] outline-none hover:bg-primary-soft',
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-highlight',
  'focus-visible:outline-offset-2',
)

const STATUS_ICONS = {
  draft: 'i-tabler-pencil',
  voice: 'i-tabler-wave-sine',
} as const

export interface PGenerationStatusProps {
  readonly kind: keyof typeof STATUS_ICONS
  readonly message: string
  readonly onCancel?: () => void
  readonly progress?: number | null
  readonly progressLabel: string
}

export const PGenerationStatus = (props: PGenerationStatusProps) => (
  <div aria-live="polite" class={STATUS_CLASSES} role="status">
    <span aria-hidden="true" class={`${STATUS_ICONS[props.kind]} size-5 flex-none`} />
    <span class="min-w-0 flex-1">{props.message}</span>
    <Show when={props.progress !== null && props.progress !== undefined}>
      <strong>{props.progress}%</strong>
      <PProgress label={props.progressLabel} value={props.progress ?? 0} />
    </Show>
    <Show when={props.onCancel}>
      {(onCancel) => (
        <button class={CANCEL_CLASSES} onClick={onCancel()} type="button">
          취소
        </button>
      )}
    </Show>
  </div>
)
