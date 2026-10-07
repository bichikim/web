import {type Accessor, createEffect, createSignal, on, onCleanup} from 'solid-js'
import type {PuppetDocument, PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import type {DeformerEditorProps} from './DeformerEditor'
import {getParameterEditTarget} from './parameter-edit-target'
import {setDeformerControlPoints} from './deformer-control-points'
import {setParameterKeyformDeformerControlPoints} from './parameter-deformer-keyforms'
import {applyGridBrush, type GridBrushMode} from './apply-grid-brush'

interface UseGridBrushProps {
  readonly editor: DeformerEditorProps
  readonly node: Accessor<PuppetSceneDeformerNode | undefined>
  readonly editable: Accessor<boolean>
  readonly getPoint: (event: MouseEvent) => PuppetPoint | undefined
  readonly transform: (point: PuppetPoint) => PuppetPoint
  readonly untransform: (point: PuppetPoint) => PuppetPoint
  readonly save: (document: PuppetDocument) => void
}

interface GridBrushStroke {
  readonly document: PuppetDocument
  readonly node: PuppetSceneDeformerNode
  readonly pointerId: number
  readonly element: SVGSVGElement
  readonly center: PuppetPoint
}

const createStrokeDocument = (
  props: UseGridBrushProps,
  current: GridBrushStroke,
  node: PuppetSceneDeformerNode,
) => {
  const target = getParameterEditTarget({...props.editor, nodeId: node.id})
  return target.kind === 'keyform'
    ? setParameterKeyformDeformerControlPoints({
        bindingId: target.bindingId,
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        document: current.document,
        nodeId: node.id,
        previewDeformer: current.node,
        values: target.values,
      })
    : setDeformerControlPoints({
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        document: current.document,
        nodeId: node.id,
      })
}

const supportsGridBrush = (node?: PuppetSceneDeformerNode) =>
  node !== undefined &&
  node.deformerType === undefined &&
  node.curveAxis === undefined &&
  node.boneRestPoints === undefined &&
  node.pins === undefined &&
  node.columns >= 1 &&
  node.rows >= 1

const INITIAL_RADIUS = 80
const INITIAL_STRENGTH = 50
const PERCENT = 100

const getBrushElement = (event: PointerEvent) =>
  event.currentTarget instanceof SVGSVGElement
    ? event.currentTarget
    : event.currentTarget instanceof SVGElement
      ? event.currentTarget.ownerSVGElement
      : null

const useStrokeCancellation = (
  props: UseGridBrushProps,
  cancel: () => void,
  active: () => boolean,
) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && active()) {
      event.preventDefault()
      cancel()
    }
  }
  createEffect(
    on(
      () => [
        props.editor.document,
        props.editor.activeNodeId,
        props.editor.deformerMode,
        props.editable(),
      ],
      cancel,
    ),
  )
  globalThis.addEventListener('keydown', handleKeyDown)
  globalThis.addEventListener('blur', cancel)
  onCleanup(() => {
    cancel()
    globalThis.removeEventListener('keydown', handleKeyDown)
    globalThis.removeEventListener('blur', cancel)
  })
}

export const useGridBrush = (props: UseGridBrushProps) => {
  const [mode, setMode] = createSignal<GridBrushMode | 'select'>('select')
  const [radius, setRadius] = createSignal(INITIAL_RADIUS)
  const [strength, setStrength] = createSignal(INITIAL_STRENGTH)
  const [hardness, setHardness] = createSignal(0)
  const [cursor, setCursor] = createSignal<PuppetPoint | null>(null)
  const [draft, setDraft] = createSignal<PuppetSceneDeformerNode | null>(null)
  let stroke: GridBrushStroke | null = null
  const available = () => supportsGridBrush(props.node())
  const canSmooth = () => (props.node()?.columns ?? 0) > 1 && (props.node()?.rows ?? 0) > 1
  const enabled = () => mode() !== 'select' && available() && (mode() !== 'smooth' || canSmooth())
  const cancel = () => {
    const previous = stroke
    stroke = null
    setDraft(null)
    setCursor(null)
    if (previous !== null) {
      if (previous.element.hasPointerCapture?.(previous.pointerId)) {
        previous.element.releasePointerCapture(previous.pointerId)
      }
      props.editor.onEditEnd?.()
    }
  }
  const move = (event: PointerEvent) => {
    if (!enabled() || !props.editable()) {
      return
    }
    const point = props.getPoint(event)
    if (point === undefined) {
      return
    }
    setCursor(point)
    if (stroke === null || stroke.pointerId !== event.pointerId) {
      return
    }
    const selected = mode()
    if (selected === 'select') {
      return
    }
    const delta = {
      x:
        event.shiftKey && selected === 'expand'
          ? -Math.abs(point.x - stroke.center.x)
          : point.x - stroke.center.x,
      y: point.y - stroke.center.y,
    }
    if (selected !== 'smooth' && delta.x === 0 && delta.y === 0) {
      setDraft(null)
      return
    }
    setDraft(
      applyGridBrush({
        center: selected === 'smooth' ? point : stroke.center,
        delta,
        hardness: hardness() / PERCENT,
        mode: selected,
        node: selected === 'smooth' ? (draft() ?? stroke.node) : stroke.node,
        radius: radius(),
        strength: strength() / PERCENT,
        transform: props.transform,
        untransform: props.untransform,
      }),
    )
  }
  const start = (event: PointerEvent) => {
    const node = props.node()
    const center = props.getPoint(event)
    if (
      !enabled() ||
      !available() ||
      !props.editable() ||
      event.button !== 0 ||
      node === undefined ||
      center === undefined ||
      props.editor.onDocumentChange === undefined
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    cancel()
    const element = getBrushElement(event)
    if (element === null) {
      return
    }
    stroke = {center, document: props.editor.document, element, node, pointerId: event.pointerId}
    element.focus()
    element.setPointerCapture?.(event.pointerId)
    props.editor.onEditStart?.()
    move(event)
  }
  const finish = (event: PointerEvent) => {
    const current = stroke
    const node = draft()
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    if (
      node !== null &&
      props.editable() &&
      props.editor.document === current.document &&
      node.controlPoints.some((value, index) => value !== current.node.controlPoints[index])
    ) {
      const document = createStrokeDocument(props, current, node)
      stroke = null
      setDraft(null)
      if (document !== undefined) {
        props.save(document)
      }
      props.editor.onEditEnd?.()
    } else {
      cancel()
    }
    if (current.element.hasPointerCapture?.(current.pointerId)) {
      current.element.releasePointerCapture(current.pointerId)
    }
  }
  useStrokeCancellation(props, cancel, () => stroke !== null)
  return {
    available,
    cancel,
    canSmooth,
    cursor,
    draft,
    enabled,
    finish,
    hardness,
    maximumRadius: () =>
      Math.max(
        INITIAL_RADIUS,
        props.editor.document.viewport.width,
        props.editor.document.viewport.height,
      ),
    mode,
    move,
    radius,
    setHardness,
    setMode: (value: GridBrushMode | 'select') => {
      cancel()
      setMode(value)
    },
    setRadius,
    setStrength,
    start,
    strength,
  }
}
