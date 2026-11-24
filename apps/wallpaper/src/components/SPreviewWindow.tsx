import {createEffect, createMemo, createSignal, createUniqueId, type JSX, onCleanup} from 'solid-js'
import {Portal} from 'solid-js/web'
import {text as uiText} from '../features/localization'
import {usePointDrag} from '../features/tracking/use-point-drag'

interface SPreviewWindowProps {
  readonly id?: string
  readonly inline?: boolean
  readonly open?: boolean
  readonly active?: boolean
  readonly children?: JSX.Element
  readonly onClose?: () => void
}
const VIEWPORT_INSET = 32

export const SPreviewWindow = (props: SPreviewWindowProps) => {
  const title = createUniqueId()
  const [inline, setInline] = createSignal<HTMLDivElement | null>(null)
  const [panel, setPanel] = createSignal<HTMLDivElement | null>(null)
  const [content, setContent] = createSignal<HTMLDivElement | null>(null)
  const mount = createMemo(() => (props.inline ? inline() : content()) ?? undefined)
  const [position, setPosition] = createSignal({x: 1, y: 1})
  const floating = () => props.active !== false && props.inline !== true && props.open === true
  const movement = usePointDrag({
    bounds: () => ({maxX: 1, maxY: 1, minX: 0, minY: 0}),
    onChange: setPosition,
    rect: () => {
      const element = panel()
      if (element === null) {
        return undefined
      }
      const rect = element.getBoundingClientRect()
      const viewport = element.ownerDocument.documentElement
      return {
        height: Math.max(1, viewport.clientHeight - rect.height - VIEWPORT_INSET),
        width: Math.max(1, viewport.clientWidth - rect.width - VIEWPORT_INSET),
      }
    },
    value: position,
  })
  let shown = false
  let previous: Element | null = null
  createEffect(() => {
    const element = panel()
    const opened = floating()
    if (element === null || opened === shown) {
      return
    }
    if (opened) {
      previous = element.ownerDocument.activeElement
      element.showPopover()
      element.focus({preventScroll: true})
    } else {
      const restore = element.contains(element.ownerDocument.activeElement)
      element.hidePopover()
      movement.cancel()
      if (restore && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({preventScroll: true})
      }
    }
    shown = opened
  })
  onCleanup(() => {
    const element = panel()
    if (shown && element?.isConnected) {
      element.hidePopover()
    }
  })
  const handleClose = () => props.onClose?.()
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault()
      props.onClose?.()
    }
  }
  const handleMoveKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || movement.dragging()) {
      movement.keyboard(event)
    }
  }
  return (
    <>
      <div ref={setInline} hidden={props.inline !== true || props.active === false} />
      <Portal>
        <div
          ref={setPanel}
          id={props.id}
          role="dialog"
          aria-labelledby={title}
          aria-modal="false"
          popover="manual"
          hidden={!floating()}
          tabindex={-1}
          onKeyDown={handleKeyboard}
          class="fixed right-auto bottom-auto m-0 box-border w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)]
            flex-col overflow-auto rounded-xl border border-solid border-stone-300 bg-white p-0
            text-stone-800 shadow-xl
            [left:calc(1rem+var(--preview-x)*(100vw-2rem))]
            [top:calc(1rem+var(--preview-y)*(100dvh-2rem))]
            [transform:translate(calc(-100%*var(--preview-x)),calc(-100%*var(--preview-y)))]
            [&:popover-open]:flex focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
          style={{'--preview-x': movement.point().x, '--preview-y': movement.point().y}}
        >
          <header
            class="flex shrink-0 items-center gap-1 border-0 border-b border-solid
            border-stone-200 bg-stone-50 p-1"
          >
            <button
              type="button"
              aria-label={uiText('미리보기 창 이동')}
              title={uiText('미리보기 창 이동')}
              class="flex h-8 min-w-0 flex-1 touch-none cursor-grab items-center gap-2 rounded-md border-0
                bg-transparent px-2 text-left text-xs font-medium text-stone-700 active:cursor-grabbing
                focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
              onPointerDown={movement.start}
              onPointerMove={movement.move}
              onPointerUp={movement.finish}
              onPointerCancel={movement.cancel}
              onLostPointerCapture={movement.cancel}
              onKeyDown={handleMoveKey}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                class="h-4 w-4 shrink-0 fill-current text-stone-400"
              >
                <circle cx="7" cy="5" r="1" />
                <circle cx="13" cy="5" r="1" />
                <circle cx="7" cy="10" r="1" />
                <circle cx="13" cy="10" r="1" />
                <circle cx="7" cy="15" r="1" />
                <circle cx="13" cy="15" r="1" />
              </svg>
              <span id={title} class="truncate">
                {uiText('미리보기')}
              </span>
            </button>
            <button
              type="button"
              aria-label={uiText('미리보기 창 닫기')}
              title={uiText('미리보기 창 닫기')}
              onClick={handleClose}
              class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent
                text-stone-500 hover:bg-stone-200 hover:text-stone-800 focus-visible:outline-solid
                focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                class="h-4 w-4 fill-none stroke-current [stroke-width:1.6] [stroke-linecap:round]"
              >
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </header>
          <div ref={setContent} class="min-h-0 overflow-auto p-2" />
        </div>
      </Portal>
      <Portal mount={mount()}>{props.children}</Portal>
    </>
  )
}
