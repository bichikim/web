import {Show} from 'solid-js'
import {PProgress} from './PProgress'

const STATUS_CLASSES = [
  'pomo-generation-status flex min-h-12 box-border items-center gap-[0.65rem] rounded-xl',
  'bg-[rgb(214_181_133_/_9%)] p-3 text-[#d8caba] text-[0.8rem] leading-[1.4]',
  '[&_strong]:text-[#e6c998]',
].join(' ')
const CANCEL_CLASSES = [
  'min-h-8 cursor-pointer border-0 rounded-full bg-[rgb(214_181_133_/_16%)] px-3',
  'text-[#fffaf1] text-xs font-[750] outline-none hover:bg-[rgb(214_181_133_/_24%)]',
  'focus-visible:[outline:2px_solid_#d6b585] focus-visible:[outline-offset:2px]',
].join(' ')

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
