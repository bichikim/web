import {createMemo, createSignal, For, type JSX, onCleanup, onMount, Show} from 'solid-js'
import type {ContextMenuCloseOptions, ContextMenuItem} from './types'
import {SContextMenuItem} from './SContextMenuItem'

interface SContextMenuProps {
  children?: JSX.Element
  x: number
  y: number
  items: readonly ContextMenuItem[]
  label?: string
  title?: JSX.Element
  emptyMessage?: string
  maxHeight?: number
  width?: number
  onClose?: (options?: ContextMenuCloseOptions) => void
}

export const SContextMenu = (props: SContextMenuProps) => {
  const groups = createMemo(() =>
    [...Map.groupBy(props.items, (item) => item.group)].map(([label, items]) => ({items, label})),
  )
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
    const initial = menu.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? menu
    initial.focus({preventScroll: true})
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
    if (event.isComposing || event.defaultPrevented) {
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
      class="fixed inset-auto m-0 w-[var(--menu-preferred-width)] max-w-[calc(100vw-16px)]
        max-h-[min(var(--menu-limit),calc(100dvh-16px))]
        overflow-y-auto rounded-control border border-divider
        bg-canvas p-1 font-sans text-foreground shadow-panel outline-none
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
      tabindex="-1"
      style={{
        '--menu-height': `${size().height}px`,
        '--menu-limit': props.maxHeight === undefined ? '100dvh' : `${props.maxHeight}px`,
        '--menu-preferred-width': props.width === undefined ? '13rem' : `${props.width}px`,
        '--menu-width': `${size().width}px`,
        '--menu-x': `${props.x}px`,
        '--menu-y': `${props.y}px`,
      }}
    >
      <Show when={props.title}>
        <p class="m-0 border-b border-divider px-3 py-2 text-xs font-semibold text-muted">
          {props.title}
        </p>
      </Show>
      <Show when={props.items.length === 0 && props.emptyMessage}>
        <p class="m-0 px-3 py-3 text-sm text-muted">{props.emptyMessage}</p>
      </Show>
      {props.children}
      <For each={groups()}>
        {(group) => (
          <div
            role={group.label === undefined ? 'presentation' : 'group'}
            aria-label={
              group.label === undefined ? undefined : `${group.label} · ${group.items.length}개`
            }
          >
            <Show when={group.label}>
              <p class="m-0 flex items-start justify-between gap-3 px-3 pt-3 pb-1 text-xs font-semibold">
                <span class="min-w-0 [overflow-wrap:anywhere]">{group.label}</span>
                <span class="shrink-0 font-normal text-muted">{group.items.length}개</span>
              </p>
            </Show>
            <For each={group.items}>
              {(item) => <SContextMenuItem item={item} keyboard={keyboard()} onSelect={invoke} />}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
