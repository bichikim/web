import {createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {PuppetDocument, PuppetPoint} from '../../player'
import {
  createWeightPaintStroke,
  type WeightPaintMode,
  type WeightPaintStroke,
  type WeightPaintVertex,
} from './weight-paint'
import {getEditorPoint, getEditorViewBox} from './viewport'
import type {SelectedDeformerProps} from './DeformerEditor'

export interface UseWeightPaintProps extends SelectedDeformerProps {
  readonly enabled: boolean
  readonly painting: boolean
  readonly boneIndex: number
  readonly vertices: readonly WeightPaintVertex[]
  readonly locked: boolean
}
export const useWeightPaint = (props: UseWeightPaintProps) => {
  const INITIAL_RADIUS = 80
  const INITIAL_STRENGTH = 0.3
  const [radius, setRadius] = createSignal(INITIAL_RADIUS)
  const [strength, setStrength] = createSignal(INITIAL_STRENGTH)
  const [mode, setMode] = createSignal<WeightPaintMode>('add')
  const [cursor, setCursor] = createSignal<PuppetPoint | null>(null)
  let stroke: WeightPaintStroke | null = null
  let expected: PuppetDocument | null = null
  let pointer: number | null = null
  let svg: SVGSVGElement | undefined
  const stop = () => {
    const active = stroke !== null
    stroke = null
    expected = null
    const captured = pointer
    pointer = null
    if (captured !== null && svg?.hasPointerCapture?.(captured)) {
      svg.releasePointerCapture(captured)
    }
    if (active) {
      window.removeEventListener('blur', stop)
      props.onEditEnd?.()
    }
  }
  const point = (event: PointerEvent) => {
    const element = event.currentTarget as SVGSVGElement
    const bounds = element.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      return undefined
    }
    return getEditorPoint({
      bounds,
      clientPoint: {x: event.clientX, y: event.clientY},
      viewBox: getEditorViewBox(props.document),
    })
  }
  const paint = (position: PuppetPoint) => {
    const document = stroke?.paint(position)
    if (document !== undefined) {
      expected = document
      props.onDocumentChange?.(document)
    }
  }
  const context = createMemo(() =>
    [
      props.node.id,
      props.boneIndex,
      props.enabled,
      props.painting,
      props.deformerMode,
      props.locked,
      props.node.controlPoints.length,
    ].join(':'),
  )
  createEffect(
    on(context, () => {
      stop()
      setCursor(null)
    }),
  )
  createEffect(() => {
    const {document} = props
    if (stroke !== null && expected !== document) {
      stop()
    }
  })
  onCleanup(stop)
  return {
    cursor,
    mode,
    radius,
    setMode: (value: WeightPaintMode) => {
      stop()
      setMode(value)
    },
    setRadius: (value: number) => {
      stop()
      setRadius(value)
    },
    end: (event: PointerEvent) => {
      if (pointer === event.pointerId) {
        stop()
      }
    },
    strength,
    leave: () => {
      if (stroke === null) {
        setCursor(null)
      }
    },
    stop,
    move: (event: PointerEvent) => {
      if (!props.enabled || !props.painting || (stroke !== null && pointer !== event.pointerId)) {
        return
      }
      const position = point(event)
      if (position !== undefined) {
        setCursor(position)
        paint(position)
      }
    },
    setStrength: (value: number) => {
      stop()
      setStrength(value)
    },
    start: (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !props.enabled ||
        !props.painting ||
        props.locked ||
        stroke !== null
      ) {
        return
      }
      const position = point(event)
      if (position === undefined) {
        return
      }
      const next = createWeightPaintStroke({
        boneIndex: props.boneIndex,
        document: props.document,
        nodeId: props.node.id,
        mode: mode(),
        radius: radius(),
        strength: strength(),
        vertices: props.vertices,
      })
      if (next === undefined) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      svg = event.currentTarget as SVGSVGElement
      svg.focus()
      stroke = next
      expected = props.document
      pointer = event.pointerId
      svg.setPointerCapture?.(event.pointerId)
      window.addEventListener('blur', stop)
      props.onEditStart?.()
      setCursor(position)
      paint(position)
    },
  }
}
