import {createEffect, createSignal, type JSX, onCleanup, Show, untrack} from 'solid-js'
import {useSidebarResize} from './use-sidebar-resize'

interface SResizablePanelsProps {
  children?: JSX.Element
  sidebar?: JSX.Element
  visible?: boolean
  minimum?: number
  contentMinimum?: number
  initialWidth?: number
  controls?: string
}

export const SResizablePanels = (props: SResizablePanelsProps) => {
  const MINIMUM_SIDEBAR = 200
  const MINIMUM_CONTENT = 240
  const SEPARATOR_WIDTH = 6
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [available, setAvailable] = createSignal(0)
  const minimum = () => props.minimum ?? MINIMUM_SIDEBAR
  const contentMinimum = () => props.contentMinimum ?? MINIMUM_CONTENT
  const resize = useSidebarResize({
    availableWidth: available,
    contentMinimum,
    initialWidth: untrack(() => props.initialWidth),
    minimum,
    spacing: () => SEPARATOR_WIDTH,
    visible: () => props.visible === true,
  })
  createEffect(() => {
    const container = element()
    if (container === null) {
      return
    }
    setAvailable(container.clientWidth)
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries
      if (entry !== undefined) {
        setAvailable(entry.contentRect.width)
      }
    })
    observer.observe(container)
    onCleanup(() => observer.disconnect())
  })
  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || !event.isPrimary || resize.dragging()) {
      return
    }
    event.preventDefault()
    event.currentTarget.focus({preventScroll: true})
    event.currentTarget.setPointerCapture(event.pointerId)
    resize.begin(event.pointerId, event.clientX)
  }
  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    resize.move(event.pointerId, event.clientX)
  }
  const handlePointerEnd: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    resize.end(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    if (!event.altKey && !event.ctrlKey && !event.metaKey && resize.keyboard(event.key)) {
      event.preventDefault()
    }
  }
  return (
    <div
      class="flex min-h-0 min-w-0 flex-1 overflow-x-auto"
      classList={{'select-none': resize.dragging()}}
      ref={setElement}
      style={{
        '--content-min-width': `${contentMinimum()}px`,
        '--panels-min-width': `${contentMinimum() + (props.visible ? minimum() + SEPARATOR_WIDTH : 0)}px`,
        '--separator-width': `${SEPARATOR_WIDTH}px`,
        '--sidebar-width': `${resize.width()}px`,
      }}
    >
      <div class="flex min-h-0 w-full shrink-0 [min-width:var(--panels-min-width)]">
        <div class="flex min-h-0 flex-1 flex-col [min-width:var(--content-min-width)]">
          {props.children}
        </div>
        <Show when={props.visible}>
          <div
            aria-label="파일 트리 너비 조절"
            aria-controls={props.controls}
            aria-orientation="vertical"
            aria-valuemin={minimum()}
            aria-valuemax={resize.maximum()}
            aria-valuenow={resize.width()}
            aria-valuetext={`${resize.width()}픽셀`}
            class="group flex w-[var(--separator-width)] shrink-0 touch-none cursor-col-resize justify-center
              outline-none hover:bg-hover focus-visible:bg-hover"
            classList={{'bg-hover': resize.dragging()}}
            role="separator"
            tabindex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
          >
            <span
              aria-hidden="true"
              class="w-px bg-divider group-hover:bg-accent group-focus-visible:bg-accent"
            />
          </div>
        </Show>
        <div
          class="min-h-0 w-[var(--sidebar-width)] shrink-0 flex-col"
          classList={{flex: props.visible === true, hidden: props.visible !== true}}
        >
          {props.sidebar}
        </div>
      </div>
    </div>
  )
}
