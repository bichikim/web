import {createEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js'
import type {ContextAction} from '../features/semantics/types'

interface SWidgetContextMenuProps {
  readonly x: number
  readonly y: number
  readonly editing?: boolean
  readonly disabled?: boolean
  readonly actions?: readonly ContextAction[]
  readonly onToggle?: (id: string) => void
  readonly onSelect: () => void
  readonly onDismiss: () => void
}

export const SWidgetContextMenu = (props: SWidgetContextMenuProps) => {
  const [panel, setPanel] = createSignal<HTMLDivElement | null>(null)
  const [height, setHeight] = createSignal(0)
  const [focused, setFocused] = createSignal<string | null>(null)
  const actions = createMemo(
    () => new Map((props.actions ?? []).map((action) => [action.id, action])),
  )
  const handleSizingFocus = () => setFocused(null)
  createEffect(() => {
    const id = focused()
    if (id !== null) {
      const index = [...actions().keys()].indexOf(id)
      if (index === -1) {
        setFocused(null)
      }
      panel()
        ?.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]')
        .item(index + 1)
        ?.focus()
    }
  })
  createEffect(() => {
    const element = panel()
    if (element === null) {
      return
    }
    element.showPopover()
    const measure = () => setHeight(element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })
  const handleDismiss = (event: ToggleEvent & {currentTarget: HTMLDivElement}) => {
    if (event.newState === 'closed' && event.currentTarget.isConnected) {
      props.onDismiss()
    }
  }
  const handleSelect = () => {
    props.onSelect()
    props.onDismiss()
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    const items = [
      ...(panel()?.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]:not(:disabled)') ??
        []),
    ]
    const current = items.findIndex((item) => item === document.activeElement)
    let next: number
    switch (event.key) {
      case 'ArrowDown':
        next = (current + 1) % items.length
        break
      case 'ArrowUp':
        next = (current + items.length - 1) % items.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        props.onDismiss()
        return
      case 'Tab':
        props.onDismiss()
        return
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
    items[next]?.focus()
  }
  return (
    <div
      ref={setPanel}
      role="menu"
      aria-label="Poffo 위젯 메뉴"
      popover="auto"
      class="fixed bottom-auto right-auto m-0 box-border max-h-[calc(100dvh-1rem)]
        w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-solid
        border-stone-300 bg-white p-1 text-stone-900 shadow-lg
        [left:max(8px,min(var(--menu-x),calc(100vw-min(14rem,100vw-1rem)-8px)))]
        [top:max(8px,min(var(--menu-y),calc(100dvh-var(--menu-height)-8px)))]"
      style={{
        '--menu-height': `${height()}px`,
        '--menu-x': `${props.x}px`,
        '--menu-y': `${props.y}px`,
      }}
      onBeforeToggle={handleDismiss}
      onKeyDown={handleKeyboard}
    >
      <button
        type="button"
        role="menuitem"
        autofocus
        disabled={props.disabled}
        class="min-h-8 w-full cursor-pointer rounded border-0 bg-transparent px-2 text-left
          text-[13px] [font-family:inherit] hover:bg-stone-100
          focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={handleSelect}
        onFocus={handleSizingFocus}
      >
        {props.editing ? '조정 완료' : '크기 조정'}
      </button>
      <Show when={actions().size > 0}>
        <div role="separator" aria-orientation="horizontal" class="my-1 h-px bg-stone-200" />
      </Show>
      <For each={[...actions().keys()]}>
        {(id) => {
          const action = () => actions().get(id)!
          const handleFocus = () => setFocused(id)
          const handleToggle = () => {
            props.onToggle?.(id)
            props.onDismiss()
          }
          return (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={action().checked}
              tabindex={-1}
              disabled={props.disabled || props.onToggle === undefined}
              onClick={handleToggle}
              onFocus={handleFocus}
              class="flex min-h-8 w-full cursor-pointer items-center gap-2 rounded border-0
                bg-transparent px-2 py-1 text-left text-[13px] [font-family:inherit]
                hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2
                focus-visible:outline-blue-700 disabled:opacity-40"
            >
              <span aria-hidden="true" class="w-3 shrink-0">
                {action().checked ? '✓' : ''}
              </span>
              <span class="min-w-0 break-words">{action().label}</span>
            </button>
          )
        }}
      </For>
    </div>
  )
}
