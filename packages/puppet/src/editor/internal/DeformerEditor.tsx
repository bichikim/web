import {DeformerWeights} from './DeformerWeights'
import {updateDraggedDeformer} from './deformer-drag'
import {PinEditor} from './PinEditor'
import {DeformerTools} from './DeformerTools'
import {GridBrushControls} from './GridBrushControls'
import {useGridBrush} from './use-grid-brush'
import {useDeformerGestureCancellation} from './use-deformer-gesture-cancellation'
import type {DeformerEditMode} from './DeformerMode'
import {isDeformerRestEditable, preserveDeformerPlacement} from './deformer-placement'
import {BoneEditor} from './BoneEditor'
import {SpatialDeformerEditor} from './SpatialDeformerEditor'
import {editCurveTopology} from './curve-topology'
import {findCurveSplit} from './deformer-paths'
import {type Accessor, createEffect, createSignal, type JSX, Show, untrack} from 'solid-js'

import type {PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'
import {DeformerControls} from './DeformerControls'
import {
  createDeformerControlSelection,
  type DeformerControlSelection,
  type DeformerDragTarget,
} from './deformer-control-selection'
import {applySceneNodeAncestorsPoint, unapplySceneNodeAncestorsPoint} from './scene-deformation'
import {getDeformerAngle, getDeformerRotationOrigin} from './deformer-transform'
import {getEditorPoint, getEditorViewBox} from './viewport'

export interface SelectedDeformerProps extends DeformerEditorProps {
  readonly node: PuppetSceneDeformerNode
}

export interface DeformerEditorProps {
  readonly brushControlsExternal?: boolean
  readonly brushControlsMount?: HTMLDivElement
  readonly brushSettingsMount?: HTMLDivElement
  readonly deformerMode?: DeformerEditMode
  readonly onDeformerModeChange?: (mode: DeformerEditMode) => void
  readonly renderControls?: (controls: JSX.Element) => JSX.Element
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly controlSelection?: DeformerControlSelection
  readonly previewDocument?: PuppetDocument
  readonly targetNodeIds?: ReadonlyArray<string>
}

interface PointerEditorPointOptions {
  readonly element?: SVGSVGElement
  readonly event: MouseEvent
  readonly viewBox: ReturnType<typeof getEditorViewBox>
}

type DragTarget = DeformerDragTarget

const DEGREES_PER_HALF_ROTATION = 180
const HANDLE_RADIUS_DIVISOR = 120
const ROTATION_HANDLE_LENGTH_DIVISOR = 6

const getPointerEditorPoint = (options: PointerEditorPointOptions) => {
  const bounds = options.element?.getBoundingClientRect()

  return bounds === undefined
    ? undefined
    : getEditorPoint({
        bounds,
        clientPoint: {x: options.event.clientX, y: options.event.clientY},
        viewBox: options.viewBox,
      })
}

const getSelectedDeformer = (document: PuppetDocument, nodeId?: string) => {
  const node = nodeId === undefined ? undefined : getSceneNode(document, nodeId)
  return node?.kind === 'deformer' ? node : undefined
}

const getRotationHandle = (
  deformer: PuppetSceneDeformerNode,
  length: number,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const origin = getDeformerRotationOrigin(deformer)
  const radians = (getDeformerAngle(deformer) * Math.PI) / DEGREES_PER_HALF_ROTATION
  return transform({
    x: origin.x + Math.cos(radians) * length,
    y: origin.y + Math.sin(radians) * length,
  })
}

interface EditBlockOptions {
  readonly activeNodeId?: string
  readonly document: PuppetDocument
}

const getEditBlockMessage = (options: EditBlockOptions) => {
  if (
    options.activeNodeId !== undefined &&
    isSceneNodeLocked(options.document, options.activeNodeId)
  ) {
    return '잠긴 디포머는 편집할 수 없습니다.'
  }

  return undefined
}

interface CurveTopologyHandlersOptions {
  readonly deformer: Accessor<PuppetSceneDeformerNode | undefined>
  readonly document: Accessor<PuppetDocument>
  readonly editable: Accessor<boolean>
  readonly getPoint: (event: MouseEvent) => PuppetPoint | undefined
  readonly transform: (point: PuppetPoint) => PuppetPoint
  readonly focus: () => void
  readonly selection: DeformerControlSelection
  readonly onDocumentChange: (document: PuppetDocument) => void
}

const createCurveTopologyHandlers = (options: CurveTopologyHandlersOptions) => {
  const CUBIC_DEGREE = 3
  const handleCurveSplit = (event: MouseEvent) => {
    const node = options.deformer()
    const point = options.getPoint(event)
    if (!options.editable() || node?.curveAxis === undefined || point === undefined) {
      return
    }
    const split = findCurveSplit({node, point, transform: options.transform})
    if (split === undefined) {
      return
    }
    const document = editCurveTopology({
      document: options.document(),
      nodeId: node.id,
      operation: 'split',
      ...split,
    })
    if (document !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      options.onDocumentChange?.(document)
      options.selection.select({ctrlKey: false, metaKey: false}, node.id, {
        kind: 'controlPoint',
        pointIndex: (split.index + 1) * CUBIC_DEGREE,
      })
      options.focus()
    }
  }
  const handleTopologyKey = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      (event.key !== 'Backspace' && event.key !== 'Delete') ||
      !options.editable() ||
      !(event.target instanceof SVGElement)
    ) {
      return
    }
    const node = options.deformer()
    if (node?.curveAxis === undefined) {
      return
    }
    const indices = options.selection
      .selectedPointIndices()
      .filter(
        (index) =>
          index > 0 && index < node.controlPoints.length / 2 - 1 && index % CUBIC_DEGREE === 0,
      )
      .toSorted((left, right) => right - left)
    let document = options.document()
    for (const index of indices) {
      document =
        editCurveTopology({
          document,
          index: index / CUBIC_DEGREE,
          nodeId: node.id,
          operation: 'remove',
        }) ?? document
    }
    if (document !== options.document()) {
      event.preventDefault()
      event.stopPropagation()
      options.onDocumentChange?.(document)
      options.selection.clear()
      options.focus()
    }
  }

  return {handleCurveSplit, handleTopologyKey}
}

const getRotationStart = (node: PuppetSceneDeformerNode | undefined, point: PuppetPoint) => {
  if (node === undefined) {
    return undefined
  }
  const origin = getDeformerRotationOrigin(node)
  return {
    angle:
      (Math.atan2(point.y - origin.y, point.x - origin.x) * DEGREES_PER_HALF_ROTATION) / Math.PI,
    deformer: node,
  }
}

const createSurfaceCoordinates = (
  props: DeformerEditorProps,
  displayDocument: Accessor<PuppetDocument>,
  element: Accessor<SVGSVGElement | undefined>,
) => {
  const viewBox = () => getEditorViewBox(displayDocument())
  const handleRadius = () => Math.min(viewBox().width, viewBox().height) / HANDLE_RADIUS_DIVISOR
  const transformPoint = (point: PuppetPoint) =>
    applySceneNodeAncestorsPoint({
      document: displayDocument(),
      nodeId: props.activeNodeId ?? '',
      point,
    })
  const untransformPoint = (point: PuppetPoint) =>
    unapplySceneNodeAncestorsPoint({
      document: displayDocument(),
      nodeId: props.activeNodeId ?? '',
      point,
    })
  const rotationOrigin = (activeDeformer: PuppetSceneDeformerNode) =>
    transformPoint(getDeformerRotationOrigin(activeDeformer))
  const getPointerPoint = (event: MouseEvent) =>
    getPointerEditorPoint({element: element(), event, viewBox: viewBox()})
  return {getPointerPoint, handleRadius, rotationOrigin, transformPoint, untransformPoint, viewBox}
}

const useSurfaceEditor = (props: DeformerEditorProps) => {
  const controlSelection = untrack(() => props.controlSelection) ?? createDeformerControlSelection()
  let dragTarget: DragTarget | null = null
  let pointerId: number | undefined
  let rotationStart: {deformer: PuppetSceneDeformerNode; angle: number} | undefined
  let svgElement: SVGSVGElement | undefined
  const displayDocument = () => props.previewDocument ?? props.document
  const sourceDeformer = () => getSelectedDeformer(displayDocument(), props.activeNodeId)
  const deformer = (): PuppetSceneDeformerNode | undefined => brush.draft() ?? sourceDeformer()
  const editBlockMessage = () =>
    getEditBlockMessage({activeNodeId: props.activeNodeId, document: props.document})
  const restEditable = () => isDeformerRestEditable(props.document, props.activeNodeId ?? '')
  const editable = () =>
    editBlockMessage() === undefined && (props.deformerMode !== 'rest' || restEditable())
  const save = (document: PuppetDocument) =>
    changeDocument(
      props.deformerMode === 'rest'
        ? preserveDeformerPlacement(props.document, document, props.activeNodeId)
        : document,
    )
  const {viewBox, handleRadius, transformPoint, untransformPoint, rotationOrigin, getPointerPoint} =
    createSurfaceCoordinates(props, displayDocument, () => svgElement)
  const brush = useGridBrush({
    editable,
    editor: props,
    getPoint: getPointerPoint,
    node: sourceDeformer,
    save,
    transform: transformPoint,
    untransform: untransformPoint,
  })
  const startDrag = (event: PointerEvent, target: DragTarget) => {
    if (brush.enabled()) {
      brush.start(event)
      return
    }
    if (event.button !== 0 || !editable()) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    svgElement?.focus()
    dragTarget = target
    ;({pointerId} = event)
    const point = getPointerPoint(event)
    rotationStart =
      target.kind === 'rotation' && point !== undefined
        ? getRotationStart(deformer(), untransformPoint(point))
        : undefined
    svgElement?.setPointerCapture?.(event.pointerId)
    props.onEditStart?.()
  }
  const startTranslationDrag = (event: PointerEvent) => {
    const point = getPointerPoint(event)

    if (point === undefined) {
      return
    }

    startDrag(event, {kind: 'translation', previousPoint: untransformPoint(point)})
  }

  const updateDeformer = (target: DragTarget, point: PuppetPoint) => {
    const activeNodeId = untrack(() => props.activeNodeId)

    if (activeNodeId === undefined || !editable()) {
      return
    }

    const document = updateDraggedDeformer({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      deformer: target.kind === 'rotation' ? (rotationStart?.deformer ?? deformer()) : deformer(),
      document: props.document,
      editMode: props.editMode,
      nodeId: activeNodeId,
      point: untransformPoint(point),
      previewDeformer: deformer(),
      rotationAngle: target.kind === 'rotation' ? rotationStart?.angle : undefined,
      target,
      targetNodeIds: props.targetNodeIds,
    })

    if (document !== undefined) {
      save(document)
    }
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (brush.enabled()) {
      brush.move(event)
      return
    }
    const target = dragTarget
    if (target === null || event.pointerId !== pointerId) {
      return
    }

    const point = getPointerPoint(event)

    if (point === undefined) {
      return
    }

    updateDeformer(target, point)

    if (target.kind === 'translation') {
      dragTarget = {...target, previousPoint: untransformPoint(point)}
    }
  }

  const stopDrag = (event?: PointerEvent) => {
    if (dragTarget === null || (event !== undefined && event.pointerId !== pointerId)) {
      return
    }
    dragTarget = null
    rotationStart = undefined
    const capturedId = pointerId
    pointerId = undefined
    if (capturedId !== undefined && svgElement?.hasPointerCapture?.(capturedId)) {
      svgElement.releasePointerCapture(capturedId)
    }
    props.onEditEnd?.()
  }
  const {changeDocument} = useDeformerGestureCancellation(props, stopDrag)

  const topology = createCurveTopologyHandlers({
    deformer,
    document: () => props.document,
    editable,
    focus: () => svgElement?.focus(),
    getPoint: getPointerPoint,
    onDocumentChange: save,
    selection: controlSelection,
    transform: transformPoint,
  })

  return {
    bind: (element: SVGSVGElement) => (svgElement = element),
    brush,
    changeMode: (mode: DeformerEditMode) => {
      stopDrag()
      controlSelection.clear()
      props.onDeformerModeChange?.(mode)
    },
    controlSelection,
    deformer,
    editable,
    editBlockMessage,
    handlePointerMove,
    handleRadius,
    restEditable,
    rotationOrigin,
    startDrag,
    startTranslationDrag,
    stopDrag,
    topology,
    transformPoint,
    updateDeformer,
    viewBox,
  }
}

const SurfaceEditor = (props: DeformerEditorProps) => {
  const editor = useSurfaceEditor(props)
  createEffect(() => {
    if (props.brushControlsExternal && props.brushControlsMount === undefined) {
      editor.brush.setMode('select')
    }
  })
  const controls = (
    <DeformerTools
      mode={props.deformerMode ?? 'pose'}
      restEditable={editor.restEditable()}
      onChange={editor.changeMode}
    />
  )
  return (
    <Show when={editor.deformer()}>
      {(activeDeformer) => (
        <div class="deformer-editor">
          <GridBrushControls
            brush={editor.brush}
            brushControlsExternal={props.brushControlsExternal}
            brushControlsMount={props.brushControlsMount}
            brushSettingsMount={props.brushSettingsMount}
            disabled={!editor.editable()}
          />
          {props.renderControls === undefined ? controls : props.renderControls(controls)}
          <svg
            ref={editor.bind}
            aria-label="디포머 편집 영역"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${editor.viewBox().x} ${editor.viewBox().y} ${editor.viewBox().width} ${editor.viewBox().height}`}
            tabindex={0}
            onKeyDown={editor.topology.handleTopologyKey}
            onLostPointerCapture={(event) => {
              editor.brush.cancel()
              editor.stopDrag(event)
            }}
            onPointerDown={editor.brush.start}
            onPointerCancel={() => {
              editor.brush.cancel()
              editor.stopDrag()
            }}
            onPointerMove={editor.handlePointerMove}
            onPointerUp={(event) => {
              editor.brush.finish(event)
              editor.stopDrag(event)
            }}
          >
            <DeformerControls
              onCurveSplit={editor.topology.handleCurveSplit}
              controlSelection={editor.controlSelection}
              deformer={activeDeformer()}
              editable={editor.editable()}
              handle={getRotationHandle(
                activeDeformer(),
                Math.min(editor.viewBox().width, editor.viewBox().height) /
                  ROTATION_HANDLE_LENGTH_DIVISOR,
                editor.transformPoint,
              )}
              moveCurveHandle={(pointIndex, axis, point) =>
                editor.updateDeformer({axis, kind: 'curveHandle', pointIndex}, point)
              }
              movePoint={(pointIndex, point) =>
                editor.updateDeformer({kind: 'controlPoint', pointIndex}, point)
              }
              origin={editor.rotationOrigin(activeDeformer())}
              radius={editor.handleRadius()}
              startDrag={editor.startDrag}
              startTranslationDrag={editor.startTranslationDrag}
              transform={editor.transformPoint}
            />
            <Show when={editor.brush.enabled() && editor.brush.cursor()}>
              {(cursor) => (
                <circle
                  class="deform-brush-ring"
                  cx={cursor().x}
                  cy={cursor().y}
                  style={{'--brush-radius': editor.brush.radius()}}
                />
              )}
            </Show>
          </svg>
          <DeformerWeights {...props} node={activeDeformer()} />
          <Show when={editor.editBlockMessage()}>
            {(message) => (
              <p class="deformer-edit-message" role="status">
                {message()}
              </p>
            )}
          </Show>
        </div>
      )}
    </Show>
  )
}

export const DeformerEditor = (props: DeformerEditorProps) => {
  const [localMode, setLocalMode] = createSignal<DeformerEditMode>('pose')
  const mode = () => props.deformerMode ?? localMode()
  const changeMode = (value: DeformerEditMode) => {
    setLocalMode(value)
    props.onDeformerModeChange?.(value)
  }
  const node = () =>
    getSelectedDeformer(props.previewDocument ?? props.document, props.activeNodeId)
  return (
    <Show
      when={node()?.deformerType === 'spatial'}
      fallback={
        <Show
          when={node()?.pins !== undefined}
          fallback={
            <Show
              when={node()?.boneRestPoints !== undefined}
              fallback={
                <SurfaceEditor {...props} deformerMode={mode()} onDeformerModeChange={changeMode} />
              }
            >
              <BoneEditor
                {...props}
                node={node()!}
                deformerMode={mode()}
                onDeformerModeChange={changeMode}
              />
            </Show>
          }
        >
          <PinEditor
            {...props}
            node={node()!}
            deformerMode={mode()}
            onDeformerModeChange={changeMode}
          />
        </Show>
      }
    >
      <SpatialDeformerEditor {...props} node={node()!} />
    </Show>
  )
}
