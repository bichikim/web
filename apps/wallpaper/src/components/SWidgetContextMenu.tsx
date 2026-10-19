import {createEffect, createSignal} from 'solid-js'

interface SWidgetContextMenuProps {
  readonly x: number
  readonly y: number
  readonly editing?: boolean
  readonly disabled?: boolean
  readonly onSelect: () => void
  readonly onDismiss: () => void
}

export const SWidgetContextMenu = (props: SWidgetContextMenuProps) => {
  const [panel, setPanel] = createSignal<HTMLDivElement | null>(null)
  createEffect(() => panel()?.showPopover())
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
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      props.onDismiss()
    }
  }
  return (
    <div
      ref={setPanel}
      role="menu"
      aria-label="Poffo 위젯 메뉴"
      popover="auto"
      class="fixed bottom-auto right-auto m-0 box-border w-36 rounded-lg border border-solid
        border-stone-300 bg-white p-1 text-stone-900 shadow-lg
        [left:max(0px,min(var(--menu-x),calc(100vw-9rem)))]
        [top:max(0px,min(var(--menu-y),calc(100vh-2.75rem)))]"
      style={{'--menu-x': `${props.x}px`, '--menu-y': `${props.y}px`}}
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
      >
        {props.editing ? '조정 완료' : '크기 조정'}
      </button>
    </div>
  )
}
