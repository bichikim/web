import {createEffect, createSignal, type JSX, onCleanup, Show, untrack} from 'solid-js'
import {cx} from 'class-variance-authority'
import {reportClientError} from 'src/features/client-error-reporter'
import {RelaxGlassRenderer, type VirtualLightPosition} from 'src/features/relax-glass-renderer'
import {DEFAULT_RELAX_BACKGROUND_SOURCE} from './background-options'
import {DEFAULT_DAYLIGHT_POSITION, DEFAULT_INTERIOR_POSITION} from './light-positions'
import type {RelaxDepthInput, RelaxDepthOffset, RelaxWeather} from './types'

export interface RelaxGlassBackgroundProps {
  readonly backgroundSrc?: string
  readonly daylightPosition?: VirtualLightPosition
  readonly depthInput?: RelaxDepthInput
  readonly depthOffset?: RelaxDepthOffset
  readonly depthSrc?: string
  readonly interiorPosition?: VirtualLightPosition
  readonly mistIntensity?: number
  readonly onPointerDown?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly onPointerMove?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly onPointerUp?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly weather?: RelaxWeather
}

export const RelaxGlassBackground = (props: RelaxGlassBackgroundProps) => {
  const [ready, setReady] = createSignal(false)
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [renderer, setRenderer] = createSignal<RelaxGlassRenderer | null>(null)
  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerDown?.(event)
  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerMove?.(event)
  const handlePointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerUp?.(event)

  createEffect(() => {
    const element = canvas()
    if (element === null) {
      return
    }
    const source = props.backgroundSrc ?? DEFAULT_RELAX_BACKGROUND_SOURCE
    const instance = new RelaxGlassRenderer(element, {
      daylight: untrack(() => props.daylightPosition ?? DEFAULT_DAYLIGHT_POSITION),
      interior: untrack(() => props.interiorPosition ?? DEFAULT_INTERIOR_POSITION),
    })
    let disposed = false
    setReady(false)
    setRenderer(instance)
    instance.setRainEnabled(untrack(() => props.weather === 'rainy'))
    instance.setMistIntensity(untrack(() => props.mistIntensity ?? 1))
    const initialDepthOffset = untrack(() => props.depthOffset)
    instance.setDepthOffset(initialDepthOffset?.x ?? 0, initialDepthOffset?.y ?? 0)
    instance
      .initialize(source, props.depthSrc)
      .then(() => {
        if (!disposed) {
          setReady(true)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          reportClientError(error, {feature: 'relax-glass-renderer', source: 'direct'})
        }
      })
    onCleanup(() => {
      disposed = true
      setRenderer(null)
      instance.destroy()
    })
  })

  createEffect(() => {
    const position = props.daylightPosition ?? DEFAULT_DAYLIGHT_POSITION
    renderer()?.setDaylightPosition(position)
  })

  createEffect(() => {
    renderer()?.setRainEnabled(props.weather === 'rainy')
  })

  createEffect(() => {
    renderer()?.setMistIntensity(props.mistIntensity ?? 1)
  })

  createEffect(() => {
    const offset = props.depthOffset
    renderer()?.setDepthOffset(offset?.x ?? 0, offset?.y ?? 0)
  })

  return (
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <Show when={!ready()}>
        <img
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          src={props.backgroundSrc ?? DEFAULT_RELAX_BACKGROUND_SOURCE}
        />
        <Show when={props.weather !== 'rainy'}>
          <div
            class={cx(
              'absolute inset-0 bg-cover bg-left opacity-30 mix-blend-screen',
              'sm:bg-center sm:opacity-55',
              "bg-[url('/slowcove/glass-residue.webp')]",
            )}
          />
          <div
            class={cx(
              'absolute -left-[18%] -top-[30%] h-[75%] w-[68%] rounded-full',
              'bg-[radial-gradient(circle,rgba(255,230,179,0.3),transparent_70%)] blur-3xl',
              'motion-safe:animate-relax-sunlight-shift',
            )}
          />
          <div
            class={cx(
              'absolute inset-0 bg-cover bg-right opacity-35 blur-sm mix-blend-screen sm:bg-center',
              "bg-[url('/slowcove/interior-reflection.webp')]",
              'motion-safe:animate-relax-glass-reflection',
            )}
          />
        </Show>
      </Show>
      <canvas
        ref={setCanvas}
        class={cx('absolute inset-0 h-full w-full', !ready() && 'invisible')}
      />
      <div class="absolute inset-0 bg-gradient-to-b from-#111921/10 via-#0c141b/15 to-#090d12/80" />
      <Show when={props.depthSrc !== undefined && props.depthInput === 'drag'}>
        <div
          class="pointer-events-auto absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          onLostPointerCapture={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </Show>
    </div>
  )
}
