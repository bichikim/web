import {type Accessor, createEffect, createSignal, For, type JSX, onCleanup, Show} from 'solid-js'

import {findErasedStrokes} from './erase-path'
import {DRAWING_COLORS, DRAWING_THICKNESSES} from './brush-classes'

import * as m from '@paraglide/message'
import {
  MAXIMUM_POINT_COUNT,
  MAXIMUM_STROKE_COUNT,
  type PictureDiaryImage,
  type PictureDiaryPoint,
  type PictureDiaryStroke,
} from '../../../features/picture-diary'

const DRAWING_WIDTH = 1_000
const DRAWING_HEIGHT = 562

export interface PictureDiaryCanvasProps {
  readonly color?: PictureDiaryStroke['color']
  readonly thickness?: PictureDiaryStroke['thickness']
  readonly tool?: 'pen' | 'eraser'
  readonly gestureRevision?: number
  readonly onStart?: () => void
  readonly image?: PictureDiaryImage
  readonly accessibleLabel?: string
  readonly onChange?: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
  readonly onLimit?: () => void
  readonly readOnly?: boolean
  readonly strokes?: ReadonlyArray<PictureDiaryStroke>
}

const getPoint = (event: PointerEvent & {currentTarget: SVGSVGElement}): PictureDiaryPoint => {
  const bounds = event.currentTarget.getBoundingClientRect()
  const x = bounds.width === 0 ? 0 : (event.clientX - bounds.left) / bounds.width
  const y = bounds.height === 0 ? 0 : (event.clientY - bounds.top) / bounds.height
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  }
}

const getPolylinePoints = (stroke: PictureDiaryStroke) =>
  stroke.points.map((point) => `${point.x * DRAWING_WIDTH},${point.y * DRAWING_HEIGHT}`).join(' ')

const useImageUrl = (image: Accessor<PictureDiaryImage | undefined>) => {
  const [imageUrl, setImageUrl] = createSignal<string>()
  createEffect(() => {
    const storedImage = image()
    if (storedImage === undefined) {
      setImageUrl(undefined)
      return
    }
    const url = URL.createObjectURL(storedImage.blob)
    setImageUrl(url)
    onCleanup(() => URL.revokeObjectURL(url))
  })
  return imageUrl
}

export const PictureDiaryCanvas = (props: PictureDiaryCanvasProps) => {
  const imageUrl = useImageUrl(() => props.image)
  let svgElement: SVGSVGElement | undefined
  let activePointerId: number | null = null
  let activeGestureRevision = 0
  let erasing = false
  let erased = false
  let previousPoint = {x: 0, y: 0}
  const cancelActiveGesture = () => {
    if (activePointerId !== null) {
      svgElement?.releasePointerCapture?.(activePointerId)
    }

    activePointerId = null
    erasing = false
    erased = false
  }
  createEffect(() => {
    props.gestureRevision
    cancelActiveGesture()
  })
  const erase = (event: PointerEvent & {currentTarget: SVGSVGElement}) => {
    const point = {x: event.clientX ?? 0, y: event.clientY ?? 0}
    const indices = findErasedStrokes({
      canvas: event.currentTarget,
      from: previousPoint,
      target: event.target,
      to: point,
    })
    previousPoint = point
    if (indices.size === 0) {
      return
    }
    if (!erased) {
      props.onStart?.()
    }
    erased = true
    props.onChange?.((props.strokes ?? []).filter((_, index) => !indices.has(index)))
  }

  const handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    if (props.readOnly === true || event.button !== 0 || activePointerId !== null) {
      return
    }
    activeGestureRevision = props.gestureRevision ?? 0
    erasing = props.tool === 'eraser'
    if (erasing) {
      activePointerId = event.pointerId
      erased = false
      previousPoint = {x: event.clientX ?? 0, y: event.clientY ?? 0}
      event.currentTarget.setPointerCapture?.(event.pointerId)
      erase(event)
      return
    }
    if ((props.strokes?.length ?? 0) >= MAXIMUM_STROKE_COUNT) {
      props.onLimit?.()
      return
    }

    props.onStart?.()
    activePointerId = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    props.onChange?.([
      ...(props.strokes ?? []),
      {color: props.color, points: [getPoint(event)], thickness: props.thickness},
    ])
  }

  const handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    if (
      activePointerId !== event.pointerId ||
      event.buttons !== 1 ||
      (props.gestureRevision ?? 0) !== activeGestureRevision
    ) {
      return
    }

    if (erasing) {
      erase(event)
      return
    }
    const strokes = props.strokes ?? []
    const activeStroke = strokes.at(-1)

    if (activeStroke === undefined) {
      return
    }
    if (activeStroke.points.length >= MAXIMUM_POINT_COUNT) {
      props.onLimit?.()
      return
    }

    props.onChange?.([
      ...strokes.slice(0, -1),
      {...activeStroke, points: [...activeStroke.points, getPoint(event)]},
    ])
  }

  const handlePointerEnd: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    if (activePointerId !== event.pointerId) {
      return
    }

    activePointerId = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <svg
      aria-label={props.accessibleLabel ?? m.picture_diary_canvas()}
      class="picture-diary-book__canvas"
      ref={(element) => (svgElement = element)}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onLostPointerCapture={() => {
        activePointerId = null
      }}
      data-read-only={props.readOnly === true ? '' : undefined}
      role="img"
      viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
    >
      <Show when={imageUrl()}>
        {(url) => (
          <image
            href={url()}
            width={DRAWING_WIDTH}
            height={DRAWING_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
            class="pointer-events-none"
          />
        )}
      </Show>
      <For each={props.strokes ?? []}>
        {(stroke, index) => (
          <g data-stroke-index={index()} class={DRAWING_COLORS[stroke.color ?? 'ink']}>
            <Show
              fallback={
                <circle
                  class={`fill-current ${DRAWING_THICKNESSES[stroke.thickness ?? 'medium']}`}
                  cx={stroke.points[0]?.x === undefined ? 0 : stroke.points[0].x * DRAWING_WIDTH}
                  cy={stroke.points[0]?.y === undefined ? 0 : stroke.points[0].y * DRAWING_HEIGHT}
                />
              }
              when={stroke.points.length > 1}
            >
              <polyline
                class={`fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] ${
                  DRAWING_THICKNESSES[stroke.thickness ?? 'medium']
                }`}
                points={getPolylinePoints(stroke)}
              />
            </Show>
          </g>
        )}
      </For>
    </svg>
  )
}
