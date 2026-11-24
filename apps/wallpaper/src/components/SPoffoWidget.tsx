import {localizeMessage, text as uiText} from '../features/localization'

import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import {useWidget} from '../features/poffo/use-widget'
import {useWidgetResize} from '../features/poffo/use-widget-resize'
import {MOVE_HOLD_SECONDS, useWidgetMove} from '../features/poffo/use-widget-move'
import {SPoffoWidgetCharacter} from './SPoffoWidgetCharacter'
import {SWidgetLoading} from './SWidgetLoading'
import {SWidgetContextMenu} from './SWidgetContextMenu'
import {SWidgetResizeFrame} from './SWidgetResizeFrame'
import {useMicrophoneLipSync} from '../features/lipsync/use-microphone-lipsync'

interface SPoffoWidgetProps {
  readonly id: string
}
const handleContext = (event: MouseEvent) => event.preventDefault()

export const SPoffoWidget = (props: SPoffoWidgetProps) => {
  const widget = useWidget(() => props.id)
  useMicrophoneLipSync({settings: widget.lipsync, widgetId: () => props.id})
  const adjustment = useWidgetResize({onSave: widget.saveSize})
  const [root, setRoot] = createSignal<HTMLElement | null>(null)
  const [menu, setMenu] = createSignal<{readonly x: number; readonly y: number} | null>(null)
  const draggable = createMemo(() => !adjustment.busy() && menu() === null)
  const movement = useWidgetMove({
    enabled: draggable,
    immediate: adjustment.editing,
    onError: widget.report,
  })
  createEffect(() => {
    if (adjustment.editing()) {
      root()?.focus()
    }
  })
  const handleRelease = (event: PointerEvent) => {
    movement.finish(event)
    if (event.button === 2 || (event.button === 0 && event.ctrlKey)) {
      setMenu({x: event.clientX, y: event.clientY})
    }
  }
  const handleDismiss = () => {
    setMenu(null)
    root()?.focus()
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
  return (
    <main
      ref={setRoot}
      aria-label={uiText('Poffo 위젯')}
      tabindex={0}
      class="fixed inset-0 select-none overflow-hidden bg-transparent outline-none"
      classList={{
        'cursor-grab': adjustment.editing() && !movement.moving(),
        'cursor-grabbing': movement.moving(),
      }}
      onPointerDown={movement.start}
      onPointerMove={movement.move}
      onPointerUp={handleRelease}
      onPointerCancel={movement.cancel}
      onLostPointerCapture={movement.cancel}
      onContextMenu={handleContext}
      onKeyDown={handleKeyboard}
    >
      <Show when={widget.assetId()} fallback={<SWidgetLoading />}>
        <SPoffoWidgetCharacter
          assetId={widget.assetId}
          interactive={() =>
            movement.active() || adjustment.editing() || adjustment.busy() || menu() !== null
          }
          touch={() =>
            adjustment.editing() || movement.moving() || menu() !== null
              ? undefined
              : widget.touch()
          }
          load={widget.load}
          onRenderedAlpha={widget.captureSilhouette}
          silhouette={widget.silhouette()}
          wantsSilhouette={widget.wantsSilhouette}
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
      <Show when={movement.hold()}>
        {(hold) => (
          <svg
            role="progressbar"
            aria-label={uiText('캐릭터 이동 준비')}
            aria-valuemin={0}
            aria-valuemax={MOVE_HOLD_SECONDS}
            aria-valuenow={hold().progress * MOVE_HOLD_SECONDS}
            viewBox="0 0 40 40"
            class="pointer-events-none fixed h-10 w-10 -translate-x-1/2 -translate-y-1/2 overflow-visible
              [left:var(--hold-x)] [top:var(--hold-y)] fill-none [stroke-width:3]"
            style={{
              '--hold-progress': 1 - hold().progress,
              '--hold-x': `${hold().x}px`,
              '--hold-y': `${hold().y}px`,
            }}
          >
            <circle cx="20" cy="20" r="16" class="stroke-white/80" />
            <circle
              cx="20"
              cy="20"
              r="16"
              pathLength="1"
              class="origin-center -rotate-90 stroke-blue-500 [stroke-dasharray:1]
                [stroke-dashoffset:var(--hold-progress)]
                [stroke-linecap:round]"
            />
          </svg>
        )}
      </Show>
      <Show when={adjustment.editing()}>
        <SWidgetResizeFrame
          disabled={adjustment.busy()}
          onResize={adjustment.resize}
          onFinish={adjustment.finish}
        />
      </Show>
      <Show when={adjustment.error() ?? widget.error()}>
        {(error) => (
          <p
            role="alert"
            class="absolute bottom-2 left-2 right-2 m-0 rounded bg-stone-900/80 p-2 text-xs text-white"
          >
            {localizeMessage(error() ?? '')}
          </p>
        )}
      </Show>
      <Show when={menu()}>
        {(position) => (
          <SWidgetContextMenu
            x={position().x}
            y={position().y}
            actions={widget.menuActions()}
            onToggle={widget.toggleAction}
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
