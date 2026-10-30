import {clientOnly} from '@solidjs/start'
import {createMemo, createSignal, createUniqueId, onCleanup, onMount, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useWidgetInteraction, type useWidgetPreview} from '../features/widget-preview'
import type {MouthPose} from '../features/character-speech/types'
import type {StoryCharacter} from '../features/desktop-story/frame'
import type {CharacterHitTest} from '../features/character-preview/types'

const SPuppetCharacter = clientOnly(() => import('./SPuppetCharacter'), {lazy: true})
interface SCharacterWidgetProps {
  readonly preview: ReturnType<typeof useWidgetPreview>
  readonly mouth?: MouthPose | null
  readonly speaking?: boolean
  /** Scroll choreography temporarily owns presentation without changing widget preferences. */
  readonly presentation?: StoryCharacter
}

export const SCharacterWidget = (props: SCharacterWidgetProps) => {
  const tooltipId = createUniqueId()
  const [button, setButton] = createSignal<HTMLButtonElement | null>(null)
  const [hitTest, setHitTest] = createSignal<CharacterHitTest | null>(null)
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
  const interaction = useWidgetInteraction({button, hitTest, locked, preview: () => props.preview})
  const handleReady = (test: CharacterHitTest) => {
    setHitTest(() => test)
    props.preview.finish()
  }
  const handleError = () => {
    setHitTest(null)
    props.preview.fail()
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
      aria-describedby={interaction.tooltip() === null ? undefined : tooltipId}
      onPointerEnter={interaction.handleHover}
      onPointerLeave={interaction.handleLeave}
      onPointerDown={interaction.handlePress}
      onPointerMove={interaction.handleMove}
      onPointerUp={() => props.preview.release()}
      onPointerCancel={() => props.preview.release()}
      onLostPointerCapture={() => props.preview.release()}
      onKeyDown={interaction.handleKeyDown}
      onFocus={interaction.handleFocus}
      onBlur={interaction.handleLeave}
      class="absolute left-1/2 top-1/2 aspect-[4/5]
        w-[calc(min(72vw,32rem,57.6dvh)*var(--widget-scale))] select-none
      border-0 bg-transparent p-0 outline-offset-[-10px]
      [transform:translate(calc(-50%_+_var(--widget-x)),calc(-50%_+_var(--widget-y)))]"
      classList={{
        'cursor-default!': !interaction.hovered() && !props.preview.dragging(),
        'cursor-grab!': !locked() && interaction.hovered() && !props.preview.dragging(),
        'cursor-grabbing!': !locked() && props.preview.dragging(),
        'pointer-events-none touch-pan-y': locked(),
        'touch-none': !locked(),
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
            onReady={handleReady}
            onError={handleError}
          />
        </div>
      </Show>
      <SDragHint point={interaction.tooltip()} id={tooltipId} />
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
