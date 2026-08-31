import {Show} from 'solid-js'

const CANCEL_CLASSES = [
  'ml-1 min-h-7 cursor-pointer border-0 rounded-control bg-secondary-soft px-2.5',
  'text-foreground text-xs font-750 outline-none',
  'hover:bg-[rgb(114_123_96_/_30%)] focus-visible:shadow-focus',
].join(' ')

export interface PLoadingStatusProps {
  readonly message: string
  readonly onCancel?: () => void
}

export const PLoadingStatus = (props: PLoadingStatusProps) => (
  <span class="pomo-loading">
    <span aria-hidden="true" class="pomo-loading__spinner" />
    <span>{props.message}</span>
    <Show when={props.onCancel}>
      {(onCancel) => (
        <button class={CANCEL_CLASSES} onClick={onCancel()} type="button">
          취소
        </button>
      )}
    </Show>
  </span>
)
