import {createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import type {DeformerEditorProps} from './DeformerEditor'
import {editPinLayout} from './pin-editing'
import {isDeformerRestEditable} from './deformer-placement'
import {isSceneNodeLocked} from './scene-graph'
import {setDeformerControlPoints} from './deformer-control-points'
import {getParameterEditTarget} from './parameter-edit-target'
import {setParameterKeyformDeformerControlPoints} from './parameter-keyforms'
import {applySceneNodeAncestorsPoint, unapplySceneNodeAncestorsPoint} from './scene-deformation'
import {getEditorPoint, getEditorViewBox} from './viewport'

export interface PinEditorProps extends DeformerEditorProps {
  readonly node: PuppetSceneDeformerNode
}

export const usePinEditor = (props: PinEditorProps) => {
  const [selection, setSelected] = createSignal(0)
  const selected = () => Math.min(selection(), props.node.pins!.length - 1)
  let svg: SVGSVGElement | undefined
  let dragging = false
  const rest = () => props.deformerMode === 'rest'
  const restEditable = () => isDeformerRestEditable(props.document, props.node.id)
  const target = () => getParameterEditTarget({...props, nodeId: props.node.id})
  const editable = () =>
    !isSceneNodeLocked(props.document, props.node.id) &&
    (rest() ? restEditable() : restEditable() || target().kind === 'keyform')
  const view = () => getEditorViewBox(props.document)
  const display = () => props.previewDocument ?? props.document
  const transform = (point: PuppetPoint) =>
    applySceneNodeAncestorsPoint({document: display(), nodeId: props.node.id, point})
  const local = (index: number): PuppetPoint => ({
    x: props.node.controlPoints[index * 2]!,
    y: props.node.controlPoints[index * 2 + 1]!,
  })
  const eventPoint = (event: MouseEvent) => {
    const bounds = svg?.getBoundingClientRect()
    return bounds === undefined
      ? undefined
      : unapplySceneNodeAncestorsPoint({
          document: display(),
          nodeId: props.node.id,
          point: getEditorPoint({
            bounds,
            clientPoint: {x: event.clientX, y: event.clientY},
            viewBox: view(),
          }),
        })
  }
  const layout = (
    operation: 'move' | 'append' | 'remove' | 'settings',
    point?: PuppetPoint,
    radius?: number,
    strength?: number,
  ) => {
    const document = editPinLayout({
      document: props.document,
      index: selected(),
      nodeId: props.node.id,
      operation,
      point,
      preserve: rest(),
      radius,
      strength,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      if (operation === 'remove') {
        setSelected(0)
      }
      if (operation === 'append') {
        setSelected(props.node.pins!.length - 1)
      }
    }
  }
  const move = (point: PuppetPoint) => {
    if (!editable()) {
      return
    }
    if (rest()) {
      layout('move', point)
      return
    }
    savePinPose(props, selected(), point)
  }

  const stop = () => {
    if (dragging) {
      props.onEditEnd?.()
    }
    dragging = false
  }
  const nodeId = createMemo(() => props.node.id)
  createEffect(
    on(nodeId, () => {
      stop()
      setSelected(0)
    }),
  )
  onCleanup(stop)

  return {
    bind: (element: SVGSVGElement) => {
      svg = element
    },
    editable,
    influence: () => getPinInfluence(props.node, selected(), transform),
    indices: () => props.node.pins!.map((_, index) => index),
    rest,
    point: (index: number) => transform(local(index)),
    restEditable,
    radius: () => {
      const HANDLE_DIVISOR = 120
      return Math.min(view().width, view().height) / HANDLE_DIVISOR
    },
    selected,
    remove: () => {
      if (rest() && editable()) {
        layout('remove')
      }
    },
    stop,
    append: (event: MouseEvent) => {
      if (event.target !== event.currentTarget || !rest() || !editable()) {
        return
      }
      const point = eventPoint(event)
      if (point !== undefined) {
        layout('append', point)
      }
    },
    selectedPin: () => props.node.pins?.[selected()],
    drag: (event: PointerEvent) => {
      const point = eventPoint(event)
      if (dragging && point !== undefined) {
        move(point)
      }
    },
    viewBox: () => `${view().x} ${view().y} ${view().width} ${view().height}`,
    keyDown: createPinKeyboard({
      point: () => local(selected()),
      move,
      remove: () => {
        if (rest() && editable()) {
          layout('remove')
        }
      },
    }),
    settings: (radius?: number, strength?: number) =>
      layout('settings', undefined, radius, strength),
    select: setSelected,
    start: (event: PointerEvent, index: number) => {
      if (event.button !== 0 || !editable()) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      setSelected(index)
      svg?.focus()
      svg?.setPointerCapture?.(event.pointerId)
      dragging = true
      props.onEditStart?.()
    },
  }
}

const getPinInfluence = (
  node: PuppetSceneDeformerNode,
  index: number,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const pin = node.pins?.[index]
  if (pin === undefined) {
    return ''
  }
  const center = {x: node.controlPoints[index * 2]!, y: node.controlPoints[index * 2 + 1]!}
  const SEGMENTS = 48
  return `${Array.from({length: SEGMENTS}, (_, index) => {
    const angle = (index / SEGMENTS) * Math.PI * 2
    const point = transform({
      x: center.x + Math.cos(angle) * pin.radius,
      y: center.y + Math.sin(angle) * pin.radius,
    })
    return `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`
  }).join(' ')} Z`
}

interface PinKeyboardOptions {
  readonly point: () => PuppetPoint
  readonly move: (point: PuppetPoint) => void
  readonly remove: () => void
}
const createPinKeyboard = (options: PinKeyboardOptions) => (event: KeyboardEvent) => {
  if (
    !(event.target instanceof SVGElement) ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    event.stopPropagation()
    options.remove()
    return
  }
  const LARGE_STEP = 10
  const distance = event.shiftKey ? LARGE_STEP : 1
  const point = options.point()
  const directions: Record<string, PuppetPoint> = {
    ArrowDown: {x: 0, y: distance},
    ArrowLeft: {x: -distance, y: 0},
    ArrowRight: {x: distance, y: 0},
    ArrowUp: {x: 0, y: -distance},
  }
  const delta = directions[event.key]
  if (delta !== undefined) {
    event.preventDefault()
    event.stopPropagation()
    options.move({x: point.x + delta.x, y: point.y + delta.y})
  }
}

const savePinPose = (props: PinEditorProps, index: number, point: PuppetPoint) => {
  const controlPoints = [...props.node.controlPoints]
  controlPoints.splice(index * 2, 2, point.x, point.y)
  const editTarget = getParameterEditTarget({...props, nodeId: props.node.id})
  const options = {controlPoints, document: props.document, nodeId: props.node.id}
  const document =
    editTarget.kind === 'keyform'
      ? setParameterKeyformDeformerControlPoints({
          ...options,
          bindingId: editTarget.bindingId,
          values: editTarget.values,
        })
      : setDeformerControlPoints(options)
  if (document !== undefined) {
    props.onDocumentChange?.(document)
  }
}
