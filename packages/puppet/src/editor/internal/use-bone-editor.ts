import {solveBoneIk} from '../../deformation/inverse-kinematics'
import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import type {DeformerEditorProps} from './DeformerEditor'
import {moveBoneJoint} from '../../deformation/bone'
import {editBoneRest} from './bone-editing'
import {isDeformerRestEditable} from './deformer-placement'
import {setDeformerControlPoints} from './deformer-control-points'
import {setParameterKeyformDeformerControlPoints} from './parameter-keyforms'
import {getParameterEditTarget} from './parameter-edit-target'
import {isSceneNodeLocked} from './scene-graph'
import {applySceneNodeAncestorsPoint, unapplySceneNodeAncestorsPoint} from './scene-deformation'
import {getEditorPoint, getEditorViewBox} from './viewport'

export interface UseBoneEditorProps extends DeformerEditorProps {
  readonly node: PuppetSceneDeformerNode
}
interface BoneKeyboardOptions {
  readonly selected: Accessor<number | null>
  readonly mode: Accessor<'rest' | 'pose'>
  readonly editable: Accessor<boolean>
  readonly local: (index: number) => PuppetPoint
  readonly move: (index: number, point: PuppetPoint) => void
  readonly changeRest: (
    operation: 'move' | 'append' | 'remove' | 'insert',
    index?: number,
    point?: PuppetPoint,
  ) => void
}
const createBoneKeyboard = (options: BoneKeyboardOptions) => (event: KeyboardEvent) => {
  const index = options.selected()
  if (
    !(event.target instanceof SVGElement) ||
    event.isComposing ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    index === null
  ) {
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (options.mode() === 'rest' && options.editable()) {
      event.preventDefault()
      event.stopPropagation()
      options.changeRest('remove', index)
    }
    return
  }
  const LARGE_STEP = 10
  const distance = event.shiftKey ? LARGE_STEP : 1
  const current = options.local(index)
  let next: PuppetPoint
  switch (event.key) {
    case 'ArrowLeft':
      next = {...current, x: current.x - distance}
      break
    case 'ArrowRight':
      next = {...current, x: current.x + distance}
      break
    case 'ArrowUp':
      next = {...current, y: current.y - distance}
      break
    case 'ArrowDown':
      next = {...current, y: current.y + distance}
      break
    default:
      return
  }
  event.preventDefault()
  event.stopPropagation()
  options.move(index, next)
}

export const useBoneEditor = (props: UseBoneEditorProps) => {
  const [inverse, setInverse] = createSignal(false)
  const [localMode, setMode] = createSignal<'rest' | 'pose'>('pose')
  const mode = () => props.deformerMode ?? localMode()
  const [selected, setSelected] = createSignal<number | null>(null)
  let svg: SVGSVGElement | undefined
  let dragging = false
  const viewBox = () => getEditorViewBox(props.document)
  const display = () => props.previewDocument ?? props.document
  const locked = () => isSceneNodeLocked(props.document, props.node.id)
  const restEditable = () => isDeformerRestEditable(props.document, props.node.id)
  const target = () => getParameterEditTarget({...props, nodeId: props.node.id})
  const bound = () =>
    props.document.parameterBindings?.some((binding) =>
      binding.targetDeformerIds?.includes(props.node.id),
    ) === true
  const editable = () =>
    !locked() && (mode() === 'rest' ? restEditable() : !bound() || target().kind === 'keyform')
  const points = () => (mode() === 'rest' ? props.node.boneRestPoints! : props.node.controlPoints)
  const indices = () => Array.from({length: points().length / 2}, (_, index) => index)
  const local = (index: number): PuppetPoint => ({
    x: points()[index * 2]!,
    y: points()[index * 2 + 1]!,
  })
  const transform = (point: PuppetPoint) =>
    applySceneNodeAncestorsPoint({document: display(), nodeId: props.node.id, point})
  const point = (index: number) => transform(local(index))
  const eventPoint = (event: MouseEvent) => {
    const bounds = svg?.getBoundingClientRect()
    if (bounds === undefined) {
      return undefined
    }
    return unapplySceneNodeAncestorsPoint({
      document: display(),
      nodeId: props.node.id,
      point: getEditorPoint({
        bounds,
        clientPoint: {x: event.clientX, y: event.clientY},
        viewBox: viewBox(),
      }),
    })
  }
  const changeRest = (
    operation: 'move' | 'append' | 'remove' | 'insert',
    index?: number,
    point?: PuppetPoint,
  ) => {
    if (!editable() || mode() !== 'rest') {
      return
    }
    const document = editBoneRest({
      document: props.document,
      index,
      nodeId: props.node.id,
      operation,
      point,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      if (operation !== 'move') {
        setSelected(null)
      }
    }
  }
  const move = (index: number, point: PuppetPoint) => {
    if (!editable()) {
      return
    }
    if (mode() === 'rest') {
      changeRest('move', index, point)
      return
    }
    const controlPoints =
      inverse() && index === props.node.controlPoints.length / 2 - 1
        ? solveBoneIk({node: props.node, point})
        : moveBoneJoint({index, node: props.node, point})
    saveBonePose(props, controlPoints)
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
      setInverse(false)
      setMode('pose')
      setSelected(null)
    }),
  )
  onCleanup(stop)
  return {
    bound,
    editable,
    eventPoint,
    changeRest,
    indices,
    inverse,
    keyDown: createBoneKeyboard({editable, mode, changeRest, selected, local, move}),
    mode,
    toggleInverse: () => {
      stop()
      setInverse((value) => !value)
    },
    bind: (element: SVGSVGElement) => {
      svg = element
    },
    drag: (event: PointerEvent) => {
      const index = selected()
      const position = eventPoint(event)
      if (dragging && index !== null && position !== undefined) {
        move(index, position)
      }
    },
    point,
    points,
    radius: () => {
      const HANDLE_DIVISOR = 120
      return Math.min(viewBox().width, viewBox().height) / HANDLE_DIVISOR
    },
    restEditable,
    selected,
    setMode: (value: 'rest' | 'pose') => {
      stop()
      setMode(value)
      props.onDeformerModeChange?.(value)
      setSelected(null)
    },
    setSelected,
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
    stop,
    viewBox: () => `${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`,
  }
}

const saveBonePose = (props: UseBoneEditorProps, controlPoints: ReadonlyArray<number>) => {
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
