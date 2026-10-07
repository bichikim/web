import {createSignal, For, onMount, Show} from 'solid-js'
import type {ContextMenuCloseOptions, ContextMenuItem} from './types'

interface SContextMenuProps {
  x: number
  y: number
  items: readonly ContextMenuItem[]
  label?: string
  onClose?: (options?: ContextMenuCloseOptions) => void
}

export const SContextMenu = (props: SContextMenuProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  onMount(() => {
    element()?.showPopover()
    element()?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })
  const invoke = (item: ContextMenuItem): void => {
    props.onClose?.()
    item.onSelect?.()
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    const shortcut = props.items.find(
      (item) => item.key === event.key.toLowerCase() && item.onSelect !== undefined,
    )
    if ((event.ctrlKey || event.metaKey) && shortcut !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      invoke(shortcut)
      return
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault()
      }
      event.stopPropagation()
      props.onClose?.()
      return
    }
    const items = Array.from(
      element()?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    )
    const current = items.indexOf(event.target as HTMLButtonElement)
    const destination = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      End: items.length - 1,
      Home: 0,
    }[event.key]
    if (destination !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      items[destination]?.focus()
    }
  }
  return (
    <div
      aria-label={props.label ?? '작업'}
      class="fixed inset-auto m-0 w-52 max-w-[calc(100vw-16px)] rounded-control border border-divider
        bg-canvas p-1 font-sans text-foreground shadow-panel
        [--menu-height:calc(var(--menu-count)*(var(--font-text-sm-line-height,20px)+16px)+10px)]
        left-[clamp(8px,var(--menu-x),calc(100vw-216px))]
        top-[clamp(8px,var(--menu-y),calc(100vh-var(--menu-height)-8px))]"
      onKeyDown={handleKeyboard}
      onToggle={(event) => {
        if (event.newState === 'closed' && event.currentTarget.isConnected) {
          props.onClose?.({restoreFocus: false})
        }
      }}
      popover="auto"
      ref={setElement}
      role="menu"
      style={{
        '--menu-count': props.items.length,
        '--menu-x': `${props.x}px`,
        '--menu-y': `${props.y}px`,
      }}
    >
      <For each={props.items}>
        {(item) => (
          <button
            class="ui-row flex w-full items-center justify-between gap-3 rounded-row px-3 py-2
              text-left text-sm outline-none focus:bg-hover"
            disabled={item.onSelect === undefined}
            onClick={() => invoke(item)}
            role="menuitem"
            tabindex="-1"
            type="button"
          >
            {item.label}
            <Show when={item.shortcut}>
              <span class="text-xs text-muted">{item.shortcut}</span>
            </Show>
          </button>
        )}
      </For>
    </div>
  )
}
