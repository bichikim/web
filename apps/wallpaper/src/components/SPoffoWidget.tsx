import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import {useWidget} from '../features/poffo/use-widget'
import {useWidgetResize} from '../features/poffo/use-widget-resize'
import {SPoffoWidgetCharacter} from './SPoffoWidgetCharacter'
import {SWidgetContextMenu} from './SWidgetContextMenu'
import {SWidgetResizeFrame} from './SWidgetResizeFrame'

interface SPoffoWidgetProps {
  readonly id: string
}
const handleContext = (event: MouseEvent) => event.preventDefault()

export const SPoffoWidget = (props: SPoffoWidgetProps) => {
  const widget = useWidget(() => props.id)
  const adjustment = useWidgetResize({onSave: widget.saveSize})
  const [root, setRoot] = createSignal<HTMLElement | null>(null)
  const [menu, setMenu] = createSignal<{readonly x: number; readonly y: number} | null>(null)
  const draggable = createMemo(() => !adjustment.busy() && menu() === null)
  createEffect(() => {
    if (adjustment.editing()) {
      root()?.focus()
    }
  })
  const handleRelease = (event: PointerEvent) => {
    if (event.button === 2 || (event.button === 0 && event.ctrlKey)) {
      setMenu({x: event.clientX, y: event.clientY})
    }
  }
  const handleDismiss = () => {
    setMenu(null)
    root()?.focus()
  }
  const handleDrag = (event: PointerEvent) => {
    if (!event.ctrlKey && draggable()) {
      widget.drag(event)
    }
  }
  const handleAction = () => {
    if (adjustment.editing()) {
      adjustment.finish()
    } else {
      adjustment.begin()
    }
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
      event.preventDefault()
      setMenu({x: 8, y: 8})
      return
    }
    adjustment.keyboard(event)
  }
  const error = () => adjustment.error() ?? widget.error()
  return (
    <main
      ref={setRoot}
      aria-label="Poffo 위젯"
      tabindex={0}
      class="fixed inset-0 select-none overflow-hidden bg-transparent outline-none"
      classList={{
        'active:cursor-grabbing': draggable(),
        'cursor-grab': draggable(),
      }}
      onPointerDown={handleDrag}
      onPointerUp={handleRelease}
      onContextMenu={handleContext}
      onKeyDown={handleKeyboard}
    >
      <Show when={widget.assetId()}>
        <SPoffoWidgetCharacter
          assetId={widget.assetId}
          interactive={() => adjustment.editing() || adjustment.busy() || menu() !== null}
          load={widget.load}
          agentBindings={widget.agentBindings}
          semanticBindings={widget.semanticBindings}
          lipsync={widget.lipsync}
          lipsyncId={() => props.id}
          motionId={widget.motionId}
          tracking={widget.tracking}
          trackingBindings={widget.trackingBindings}
          trackingOptions={widget.trackingOptions}
          onError={widget.report}
        />
      </Show>
      <Show when={adjustment.editing()}>
        <SWidgetResizeFrame
          disabled={adjustment.busy()}
          onResize={adjustment.resize}
          onFinish={adjustment.finish}
        />
      </Show>
      <Show when={error()}>
        {(error) => (
          <p
            role="alert"
            class="absolute bottom-2 left-2 right-2 m-0 rounded bg-stone-900/80 p-2 text-xs text-white"
          >
            {error()}
          </p>
        )}
      </Show>
      <Show when={menu()}>
        {(position) => (
          <SWidgetContextMenu
            x={position().x}
            y={position().y}
            editing={adjustment.editing()}
            disabled={adjustment.busy()}
            onSelect={handleAction}
            onDismiss={handleDismiss}
          />
        )}
      </Show>
    </main>
  )
}
