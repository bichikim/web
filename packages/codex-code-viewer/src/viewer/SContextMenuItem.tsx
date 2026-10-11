import {Show} from 'solid-js'
import type {ContextMenuItem} from './types'

interface SContextMenuItemProps {
  readonly item: ContextMenuItem
  readonly keyboard?: boolean
  readonly onSelect?: (item: ContextMenuItem) => void
}
/** Renders a menu action with an optional separator, shortcut and single-line detail. */
export const SContextMenuItem = (props: SContextMenuItemProps) => {
  const handleSelect = (): void => {
    if (props.onSelect === undefined) {
      props.item.onSelect?.()
    } else {
      props.onSelect(props.item)
    }
  }
  return (
    <>
      <Show when={props.item.separatorBefore}>
        <div
          role="separator"
          aria-orientation="horizontal"
          class="mx-2 my-1 border-t border-divider"
        />
      </Show>
      <button
        class="ui-transition flex w-full items-center justify-between gap-3 rounded-row px-3 py-2
        text-left text-sm [overflow-wrap:anywhere] outline-none enabled:hover:bg-hover enabled:active:bg-pressed"
        classList={{'focus:bg-hover': props.keyboard, 'ui-focus': props.keyboard}}
        disabled={props.item.onSelect === undefined}
        onClick={handleSelect}
        role="menuitem"
        tabindex="-1"
        type="button"
      >
        <span class="flex min-w-0 flex-1 items-center gap-3">
          <span
            classList={{
              'shrink-0 font-mono text-xs tabular-nums text-muted':
                props.item.description !== undefined,
            }}
          >
            {props.item.label}
          </span>
          <Show when={props.item.description}>
            {' '}
            <code class="min-w-0 truncate font-mono text-xs" title={props.item.description}>
              {props.item.description}
            </code>
          </Show>
        </span>
        <Show when={props.item.shortcut}>
          <span class="shrink-0 text-xs text-muted">{props.item.shortcut}</span>
        </Show>
      </button>
    </>
  )
}
