import {createSignal, For, onCleanup, onMount, Show} from 'solid-js'
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
  const [size, setSize] = createSignal({height: 0, width: 0})
  const [keyboard, setKeyboard] = createSignal(false)
  onMount(() => {
    const menu = element()
    if (menu === null) {
      return
    }
    const measure = (): void => {
      const {height, width} = menu.getBoundingClientRect()
      setSize({height, width})
    }
    menu.showPopover()
    measure()
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll: true})
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure)
      observer.observe(menu, {box: 'border-box'})
      onCleanup(() => observer.disconnect())
    }
  })
  const invoke = (item: ContextMenuItem): void => {
    props.onClose?.()
    item.onSelect?.()
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    setKeyboard(true)
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
      class="fixed inset-auto m-0 w-52 max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)]
        overflow-y-auto rounded-control border border-divider
        bg-canvas p-1 font-sans text-foreground shadow-panel
        left-[clamp(8px,var(--menu-x),calc(100vw-var(--menu-width)-8px))]
        top-[clamp(8px,var(--menu-y),calc(100dvh-var(--menu-height)-8px))]"
      onKeyDown={handleKeyboard}
      onPointerMove={() => setKeyboard(false)}
      onPointerDown={() => setKeyboard(false)}
      onToggle={(event) => {
        if (event.newState === 'closed' && event.currentTarget.isConnected) {
          props.onClose?.({restoreFocus: false})
        }
      }}
      popover="auto"
      ref={setElement}
      role="menu"
      style={{
        '--menu-height': `${size().height}px`,
        '--menu-width': `${size().width}px`,
        '--menu-x': `${props.x}px`,
        '--menu-y': `${props.y}px`,
      }}
    >
      <For each={props.items}>
        {(item) => (
          <>
            <Show when={item.separatorBefore}>
              <div
                role="separator"
                aria-orientation="horizontal"
                class="mx-2 my-1 border-t border-divider"
              />
            </Show>
            <button
              class="ui-transition flex w-full items-center justify-between gap-3 rounded-row px-3 py-2
              text-left text-sm outline-none enabled:hover:bg-hover enabled:active:bg-pressed"
              classList={{'focus:bg-hover': keyboard(), 'ui-focus': keyboard()}}
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
          </>
        )}
      </For>
    </div>
  )
}
