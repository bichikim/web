import {createSignal, onMount} from 'solid-js'
import type {ContextMenuCloseOptions} from './types'

interface SCodeContextMenuProps {
  x: number
  y: number
  onCopy?: () => void
  onShare?: () => void
  onFind?: () => void
  onClose?: (options?: ContextMenuCloseOptions) => void
}

const itemClasses = [
  'ui-row flex w-full items-center justify-between gap-3 rounded-row px-3 py-2',
  'text-left text-sm outline-none focus:bg-hover',
].join(' ')

export const SCodeContextMenu = (props: SCodeContextMenuProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  onMount(() => {
    element()?.showPopover()
    element()?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  })
  const invoke = (action?: () => void): void => {
    props.onClose?.()
    action?.()
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    const key = event.key.toLowerCase()
    if ((event.ctrlKey || event.metaKey) && (key === 'f' || key === 'c')) {
      event.preventDefault()
      event.stopPropagation()
      invoke(key === 'f' ? props.onFind : props.onCopy)
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
      aria-label="코드 작업"
      class="fixed inset-auto m-0 w-52 max-w-[calc(100vw-16px)] rounded-control border border-divider
        bg-canvas p-1 font-sans text-foreground shadow-panel
        left-[clamp(8px,var(--menu-x),calc(100vw-216px))]
        top-[clamp(8px,var(--menu-y),calc(100vh-136px))]"
      onKeyDown={handleKeyboard}
      onToggle={(event) => {
        if (event.newState === 'closed' && event.currentTarget.isConnected) {
          props.onClose?.({restoreFocus: false})
        }
      }}
      popover="auto"
      ref={setElement}
      role="menu"
      style={{'--menu-x': `${props.x}px`, '--menu-y': `${props.y}px`}}
    >
      <button
        class={itemClasses}
        disabled={props.onCopy === undefined}
        onClick={() => invoke(props.onCopy)}
        role="menuitem"
        tabindex="-1"
        type="button"
      >
        코드 복사
      </button>
      <button
        class={itemClasses}
        disabled={props.onShare === undefined}
        onClick={() => invoke(props.onShare)}
        role="menuitem"
        tabindex="-1"
        type="button"
      >
        채팅창에 추가
      </button>
      <button
        class={itemClasses}
        disabled={props.onFind === undefined}
        onClick={() => invoke(props.onFind)}
        role="menuitem"
        tabindex="-1"
        type="button"
      >
        파일 내 검색<span class="text-xs text-muted">⌘/Ctrl F</span>
      </button>
    </div>
  )
}
