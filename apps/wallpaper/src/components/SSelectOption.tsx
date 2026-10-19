import {Show} from 'solid-js'

interface SSelectOptionProps {
  readonly id: string
  readonly label: string
  readonly selected?: boolean
  readonly active?: boolean
  readonly onSelect?: () => void
}

export const SSelectOption = (props: SSelectOptionProps) => (
  <div
    id={props.id}
    role="option"
    aria-selected={props.selected ?? false}
    data-active={props.active ?? false}
    class="wallpaper-option"
    title={props.label}
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => props.onSelect?.()}
  >
    <span class="min-w-0 flex-1 truncate">{props.label}</span>
    <span aria-hidden="true" class="grid h-4 w-4 shrink-0 place-items-center text-blue-700">
      <Show when={props.selected}>
        <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="m5 12 4 4L19 6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </Show>
    </span>
  </div>
)
