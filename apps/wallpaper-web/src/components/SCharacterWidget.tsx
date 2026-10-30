import {clientOnly} from '@solidjs/start'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  Show,
} from 'solid-js'
import {Portal} from 'solid-js/web'
import type {useWidgetPreview} from '../features/widget-preview'
import type {MouthPose} from '../features/character-speech/types'
import type {StoryCharacter} from '../features/desktop-story/frame'

const SPuppetCharacter = clientOnly(() => import('./SPuppetCharacter'), {lazy: true})
interface SCharacterWidgetProps {
  readonly preview: ReturnType<typeof useWidgetPreview>
  readonly mouth?: MouthPose | null
  readonly speaking?: boolean
  /** Scroll choreography temporarily owns presentation without changing widget preferences. */
  readonly presentation?: StoryCharacter
}

export const SCharacterWidget = (props: SCharacterWidgetProps) => {
  const OFFSET_X = 12
  const OFFSET_Y = 20
  const tooltipId = createUniqueId()
  const [button, setButton] = createSignal<HTMLButtonElement | null>(null)
  const [pointer, setPointer] = createSignal<{readonly x: number; readonly y: number} | null>(null)
  let capturedPointer: number | null = null
  const locked = createMemo(() => props.presentation !== undefined)
  const expressionId = createMemo(() =>
    props.presentation ? props.presentation.expressionId : props.preview.expressionId(),
  )
  const motionId = createMemo(() => props.presentation?.motionId ?? props.preview.motionId())
  const playing = createMemo(() =>
    props.presentation
      ? props.presentation.playing !== false
      : props.preview.playing() || props.speaking === true,
  )
  const tracking = createMemo(() => locked() || props.preview.tracking())
  const tooltip = () => (locked() || props.preview.dragging() ? null : pointer())
  const handlePress = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (!locked() && event.button === 0) {
      event.preventDefault()
      event.currentTarget.focus({preventScroll: true})
      capturedPointer = event.pointerId
      props.preview.press(event)
    }
  }
  const handleHover = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      setPointer({x: event.clientX + OFFSET_X, y: event.clientY + OFFSET_Y})
    }
  }
  const handleMove = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (locked()) {
      return
    }
    props.preview.move(event)
    handleHover(event)
  }
  createEffect(() => {
    if (!locked()) {
      return
    }
    const element = button()
    if (capturedPointer !== null && element?.hasPointerCapture(capturedPointer)) {
      element.releasePointerCapture(capturedPointer)
    }
    capturedPointer = null
    props.preview.release()
    setPointer(null)
  })
  const handleFocus = (event: FocusEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.currentTarget.matches(':focus-visible')) {
      const bounds = event.currentTarget.getBoundingClientRect()
      setPointer({x: bounds.left + bounds.width / 2, y: bounds.top + OFFSET_Y})
    }
  }
  const handleKeyDown = (event: KeyboardEvent & {currentTarget: HTMLButtonElement}) => {
    props.preview.keyboard(event)
    if (event.key === 'Escape') {
      setPointer(null)
    }
  }
  onMount(() => {
    const element = button()
    if (element === null || element.parentElement === null) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (!locked()) {
        props.preview.fitPosition(element)
      }
    })
    observer.observe(element)
    observer.observe(element.parentElement)
    onCleanup(() => observer.disconnect())
  })
  return (
    <button
      ref={setButton}
      type="button"
      data-character-drag
      aria-label="흰 고양이 위젯. 드래그해서 이동"
      disabled={locked()}
      aria-hidden={locked()}
      aria-describedby={tooltip() === null ? undefined : tooltipId}
      onPointerEnter={handleHover}
      onPointerLeave={() => setPointer(null)}
      onPointerDown={handlePress}
      onPointerMove={handleMove}
      onPointerUp={() => props.preview.release()}
      onPointerCancel={() => props.preview.release()}
      onLostPointerCapture={() => props.preview.release()}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={() => setPointer(null)}
      class="absolute left-1/2 top-1/2 aspect-[4/5]
        w-[calc(min(72vw,32rem,57.6dvh)*var(--widget-scale))] select-none
      border-0 bg-transparent p-0 outline-offset-[-10px]
      [transform:translate(calc(-50%_+_var(--widget-x)),calc(-50%_+_var(--widget-y)))]"
      classList={{
        'cursor-grab touch-none': !locked() && !props.preview.dragging(),
        'cursor-grabbing touch-none': !locked() && props.preview.dragging(),
        'pointer-events-none touch-pan-y': locked(),
      }}
      style={{
        '--widget-scale': props.presentation?.scale ?? props.preview.scale(),
        '--widget-x': `${props.presentation?.x ?? props.preview.position().x}px`,
        '--widget-y': `${props.presentation?.y ?? props.preview.position().y}px`,
      }}
    >
      <img
        src="/models/white-cat/poster.webp"
        alt="흰 고양이 캐릭터 위젯"
        width="640"
        height="800"
        fetchpriority="high"
        class="pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
        classList={{'opacity-0': props.preview.phase() === 'ready'}}
      />
      <Show when={props.preview.mounted()}>
        <div
          class="h-full w-full transition-opacity duration-200"
          classList={{'opacity-0': props.preview.phase() !== 'ready'}}
        >
          <SPuppetCharacter
            expressionId={expressionId()}
            motionId={motionId()}
            playing={playing()}
            mouth={props.mouth}
            tracking={tracking()}
            onReady={props.preview.finish}
            onError={props.preview.fail}
          />
        </div>
      </Show>
      <SDragHint point={tooltip()} id={tooltipId} />
    </button>
  )
}

interface SDragHintProps {
  /** The widget's accessible description target. */
  readonly id?: string
  /** Pointer or keyboard focus anchor, absent when the widget is not interactive. */
  readonly point?: {readonly x: number; readonly y: number} | null
}

const SDragHint = (props: SDragHintProps) => (
  <Show when={props.point}>
    {(point) => (
      <Portal>
        <span
          id={props.id}
          role="tooltip"
          class="pointer-events-none fixed left-[clamp(0.75rem,var(--hint-x),calc(100vw_-_8rem))]
                top-[clamp(0.75rem,var(--hint-y),calc(100dvh_-_3rem))] whitespace-nowrap rounded-full
                border border-solid border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-500
                text-muted shadow-sm backdrop-blur-md"
          style={{'--hint-x': `${point().x}px`, '--hint-y': `${point().y}px`}}
        >
          드래그해서 이동
        </span>
      </Portal>
    )}
  </Show>
)
