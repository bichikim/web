import {cx} from 'class-variance-authority'
import {createEffect, createSignal, onCleanup, onMount, Show} from 'solid-js'

const CONTENT_GAP_PIXELS = 32
const MINIMUM_DURATION_SECONDS = 6
const TRAVEL_SPEED_PX_PER_SECOND = 28

interface MarqueeMeasurement {
  readonly overflowing: boolean
  readonly travelDistance: number
}

const INITIAL_MEASUREMENT: MarqueeMeasurement = {overflowing: false, travelDistance: 0}

export interface POverflowMarqueeProps {
  readonly class?: string
  readonly focusable?: boolean
  readonly text: string
}

export const POverflowMarquee = (props: POverflowMarqueeProps) => {
  const [contentElement, setContentElement] = createSignal<HTMLSpanElement>()
  const [measurement, setMeasurement] = createSignal(INITIAL_MEASUREMENT)
  const [viewportElement, setViewportElement] = createSignal<HTMLSpanElement>()

  const measureOverflow = () => {
    const content = contentElement()
    const viewport = viewportElement()

    if (content === undefined || viewport === undefined) {
      return
    }

    const overflowing = content.scrollWidth > viewport.clientWidth
    const travelDistance = overflowing ? content.scrollWidth + CONTENT_GAP_PIXELS : 0

    setMeasurement((currentMeasurement) => {
      if (
        currentMeasurement.overflowing === overflowing &&
        currentMeasurement.travelDistance === travelDistance
      ) {
        return currentMeasurement
      }

      return {overflowing, travelDistance}
    })
  }

  const animationDuration = () =>
    Math.max(MINIMUM_DURATION_SECONDS, measurement().travelDistance / TRAVEL_SPEED_PX_PER_SECOND)

  createEffect(() => {
    props.text
    measureOverflow()
  })

  onMount(() => {
    const content = contentElement()
    const viewport = viewportElement()

    if (content === undefined || viewport === undefined) {
      return
    }

    if (typeof ResizeObserver === 'undefined') {
      measureOverflow()
      return
    }

    const resizeObserver = new ResizeObserver(measureOverflow)
    resizeObserver.observe(content)
    resizeObserver.observe(viewport)
    measureOverflow()
    onCleanup(() => resizeObserver.disconnect())
  })

  return (
    <span
      aria-label={
        measurement().overflowing && props.focusable !== false
          ? `${props.text}. 포커스하거나 마우스를 올리면 흐름이 일시 정지됩니다.`
          : undefined
      }
      class={cx('pomo-overflow-marquee group block min-w-0 overflow-hidden', props.class)}
      data-overflowing={measurement().overflowing ? 'true' : undefined}
      ref={setViewportElement}
      tabindex={measurement().overflowing && props.focusable !== false ? 0 : undefined}
    >
      <span
        class={cx(
          'pomo-overflow-marquee__track flex w-max whitespace-nowrap',
          measurement().overflowing && 'animate-overflow-marquee',
          '[animation-duration:var(--pomo-marquee-duration)]',
          'group-hover:[animation-play-state:paused]',
          'group-focus:[animation-play-state:paused]',
          'motion-reduce:block motion-reduce:max-w-full motion-reduce:animate-none',
        )}
        style={{
          '--pomo-marquee-distance': `${measurement().travelDistance}px`,
          '--pomo-marquee-duration': `${animationDuration()}s`,
        }}
      >
        <span
          class="pomo-overflow-marquee__content block shrink-0 motion-reduce:max-w-full motion-reduce:truncate"
          ref={setContentElement}
        >
          {props.text}
        </span>
        <Show when={measurement().overflowing}>
          <span
            aria-hidden="true"
            class="pomo-overflow-marquee__clone ml-8 block shrink-0 motion-reduce:hidden"
          >
            {props.text}
          </span>
        </Show>
      </span>
    </span>
  )
}
