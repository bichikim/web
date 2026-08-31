import {Show} from 'solid-js'

const LOADING_CLASSES = [
  'pomo-loading flex min-h-control-sm box-border items-center gap-2',
  'rounded-control bg-surface py-0 px-3',
  'text-foreground text-xs font-650 leading-4 shadow-panel',
].join(' ')

const SPINNER_CLASSES = [
  'pomo-loading__spinner w-4 h-4 box-border flex-none',
  'animate-spin [border:2px_solid_rgb(255_255_255_/_28%)]',
  'border-t-highlight rounded-control',
  'motion-reduce:animate-[none]',
].join(' ')
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
  <span class={LOADING_CLASSES}>
    <span aria-hidden="true" class={SPINNER_CLASSES} />
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
