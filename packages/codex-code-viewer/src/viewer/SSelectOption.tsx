import {Show} from 'solid-js'
import {SIcon} from './SIcon'

interface SSelectOptionProps {
  readonly label: string
  readonly id?: string
  readonly active?: boolean
  readonly selected?: boolean
  readonly onSelect?: () => void
}
/** Renders a selectable option while leaving keyboard focus on the select trigger. */
export const SSelectOption = (props: SSelectOptionProps) => (
  <button
    aria-selected={props.selected ?? false}
    class="ui-row flex w-full items-center justify-between gap-4 rounded-row px-3 py-2 text-left
      data-[active=true]:bg-hover aria-selected:font-medium aria-selected:text-tree-icon"
    data-active={props.active ?? false}
    id={props.id}
    onClick={() => props.onSelect?.()}
    onPointerDown={(event) => event.preventDefault()}
    role="option"
    tabIndex={-1}
    title={props.label}
    type="button"
  >
    <span class="truncate">{props.label}</span>
    <span class="flex w-4 shrink-0">
      <Show when={props.selected}>
        <SIcon name="check" />
      </Show>
    </span>
  </button>
)
