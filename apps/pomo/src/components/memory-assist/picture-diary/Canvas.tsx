import {For, type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {
  MAXIMUM_POINT_COUNT,
  MAXIMUM_STROKE_COUNT,
  type PictureDiaryPoint,
  type PictureDiaryStroke,
} from '../../../features/picture-diary'

const DRAWING_WIDTH = 1_000
const DRAWING_HEIGHT = 562

export interface PictureDiaryCanvasProps {
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

export const PictureDiaryCanvas = (props: PictureDiaryCanvasProps) => {
  let activePointerId: number | null = null

  const handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    if (props.readOnly === true || event.button !== 0 || activePointerId !== null) {
      return
    }
    if ((props.strokes?.length ?? 0) >= MAXIMUM_STROKE_COUNT) {
      props.onLimit?.()
      return
    }

    activePointerId = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    props.onChange?.([...(props.strokes ?? []), {points: [getPoint(event)]}])
  }

  const handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    if (activePointerId !== event.pointerId || event.buttons !== 1) {
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

    props.onChange?.([...strokes.slice(0, -1), {points: [...activeStroke.points, getPoint(event)]}])
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
      <For each={props.strokes ?? []}>
        {(stroke) => (
          <Show
            fallback={
              <circle
                class="fill-foreground"
                cx={stroke.points[0]?.x === undefined ? 0 : stroke.points[0].x * DRAWING_WIDTH}
                cy={stroke.points[0]?.y === undefined ? 0 : stroke.points[0].y * DRAWING_HEIGHT}
                r="4"
              />
            }
            when={stroke.points.length > 1}
          >
            <polyline
              class={
                'fill-none stroke-foreground [stroke-linecap:round] [stroke-linejoin:round] ' +
                '[stroke-width:8]'
              }
              points={getPolylinePoints(stroke)}
            />
          </Show>
        )}
      </For>
    </svg>
  )
}
