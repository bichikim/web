import * as m from '@paraglide/message'
import {createEffect, createMemo, createSignal, createUniqueId, onCleanup} from 'solid-js'
import {
  type DrawnTarotCard,
  TAROT_ARTWORK,
  TAROT_CARD_FRAME,
  TAROT_DEPTH_ARTWORK,
  type TarotLocale,
} from 'src/features/tarot'
import {TarotDepthRenderer} from 'src/features/tarot-depth'
import {TarotCardArtwork} from './TarotCardArtwork'
import {useCardTilt} from './use-card-tilt'

interface TarotCardDepthViewProps {
  readonly showUpright?: boolean
  readonly card: DrawnTarotCard
  readonly locale: TarotLocale
}

export const TarotCardDepthView = (props: TarotCardDepthViewProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [renderer, setRenderer] = createSignal<TarotDepthRenderer | null>(null)
  const [bounds, setBounds] = createSignal({height: 1, width: 1})
  const descriptionId = createUniqueId()
  const artwork = createMemo(() => TAROT_ARTWORK[props.card.id])
  const depth = createMemo(() => TAROT_DEPTH_ARTWORK[props.card.id])
  const tilt = useCardTilt()

  createEffect(() => {
    const element = canvas()
    const image = artwork()
    const depthSource = depth()
    const name = props.card.name[props.locale]
    const marker = image?.marker[props.locale]
    if (
      element === null ||
      image === undefined ||
      depthSource === undefined ||
      marker === undefined
    ) {
      return
    }
    const instance = new TarotDepthRenderer()
    let disposed = false
    const updateBounds = () => {
      setBounds({height: element.clientHeight, width: element.clientWidth})
    }
    const observer = new ResizeObserver(updateBounds)
    observer.observe(element)
    updateBounds()
    instance
      .initialize({
        canvas: element,
        depth: depthSource,
        frame: TAROT_CARD_FRAME,
        image: image.image,
        marker,
        name,
      })
      .then((initialized) => {
        if (initialized && !disposed) {
          setRenderer(instance)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          console.error('Tarot depth rendering failed; retaining the original card.', error)
        }
      })
    onCleanup(() => {
      disposed = true
      observer.disconnect()
      setRenderer(null)
      instance.destroy()
    })
  })

  createEffect(() => {
    const instance = renderer()
    const size = bounds()
    const offset = tilt.offset()
    instance?.render({
      ...size,
      ...offset,
      reversed: props.card.orientation === 'reversed' && props.showUpright === false,
    })
  })

  return (
    <div
      role="group"
      aria-label={props.card.name[props.locale]}
      aria-describedby={descriptionId}
      tabIndex={0}
      class="relative w-[min(100vw,calc(100dvh*2/3))] aspect-[2/3] overflow-hidden rounded-[5%]
        [container-type:inline-size]
        touch-none cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-[-3px] focus-visible:outline-[#d8b97e]"
      onPointerDown={tilt.handlePointerDown}
      onPointerMove={tilt.handlePointerMove}
      onPointerUp={tilt.handlePointerUp}
      onPointerCancel={tilt.handlePointerUp}
      onLostPointerCapture={tilt.handlePointerUp}
      onPointerLeave={tilt.handlePointerLeave}
      onBlur={tilt.handlePointerLeave}
      onKeyDown={tilt.handleKeyDown}
    >
      <p id={descriptionId} class="sr-only">
        {m.tarot_card_tilt_hint()}
      </p>
      <div aria-hidden={renderer() !== null} classList={{invisible: renderer() !== null}}>
        <TarotCardArtwork
          card={props.card}
          locale={props.locale}
          showUpright={props.showUpright}
          class="w-full aspect-[2/3]"
        />
      </div>
      <canvas
        ref={setCanvas}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 h-full w-full [font-size:5cqi] [--tarot-marker-ratio:0.8]"
        classList={{invisible: renderer() === null}}
      />
    </div>
  )
}
