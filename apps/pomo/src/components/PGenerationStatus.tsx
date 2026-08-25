import {Show} from 'solid-js'

const STATUS_CLASSES = [
  'pomo-generation-status flex min-h-12 box-border items-center gap-[0.65rem] rounded-xl',
  'bg-[rgb(214_181_133_/_9%)] p-3 text-[#d8caba] text-[0.8rem] leading-[1.4]',
  '[&_strong]:ml-auto [&_strong]:text-[#e6c998]',
].join(' ')

const STATUS_ICONS = {
  draft: 'i-tabler-pencil',
  voice: 'i-tabler-wave-sine',
} as const

export interface PGenerationStatusProps {
  readonly kind: keyof typeof STATUS_ICONS
  readonly message: string
  readonly progress?: number | null
  readonly progressLabel: string
}

export const PGenerationStatus = (props: PGenerationStatusProps) => (
  <div aria-live="polite" class={STATUS_CLASSES} role="status">
    <span aria-hidden="true" class={`${STATUS_ICONS[props.kind]} size-5 flex-none`} />
    <span>{props.message}</span>
    <Show when={props.progress !== null && props.progress !== undefined}>
      <strong>{props.progress}%</strong>
      <span
        aria-label={props.progressLabel}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={props.progress!}
        class="sr-only"
        role="progressbar"
      />
    </Show>
  </div>
)
