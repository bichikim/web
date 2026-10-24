import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  type Setter,
  Show,
} from 'solid-js'
import {EditorButton} from '../../design-system'
import {placeSpatialMesh} from '../../deformation/bind-spatial-mesh'
import {generateSpatialMesh} from '../../deformation/generate-spatial-mesh'
import type {
  PuppetPart,
  PuppetSpatialMeshObject,
  PuppetSpatialObject,
  PuppetSpatialPrimitive,
  PuppetSpatialPrimitiveObject,
} from '../../player'
import {findSpatialEditorObject} from './spatial-editor-objects'
import {SpatialPreviewGizmoOverlay} from './SpatialPreviewGizmoOverlay'
import {type SpatialGizmoAxis, type SpatialPreviewGizmo} from './spatial-preview-gizmo'
import {
  createSpatialMeshPreviewRenderer,
  type SpatialMeshPreviewRenderer,
  type SpatialPreviewMesh,
  type SpatialPreviewOrbit,
} from './spatial-mesh-preview-renderer'

export type SpatialPreviewTool = 'orbit' | 'move' | 'rotate' | 'scale'
type EditableSpatialObject = PuppetSpatialPrimitiveObject | PuppetSpatialMeshObject
type SpatialTransformPatch = Partial<Pick<EditableSpatialObject, 'center' | 'rotation' | 'size'>>

const TOOL_HINTS: Record<SpatialPreviewTool, string> = {
  move: '도형이나 X·Y·Z축을 드래그해 이동',
  orbit: '드래그·방향키로 시점 회전 · Home으로 초기화',
  rotate: '도형이나 회전 링을 드래그해 회전',
  scale: '도형을 드래그해 크기 조정',
}

interface SpatialMeshPreviewProps {
  readonly bounds?: {x: number; y: number; width: number; height: number}
  readonly isOpen: boolean
  readonly meshPosition?: readonly [number, number, number]
  readonly objects?: ReadonlyArray<PuppetSpatialObject>
  readonly operations?: ReadonlyArray<PuppetSpatialPrimitive>
  readonly referenceParts?: ReadonlyArray<PuppetPart>
  readonly targetBounds?: {x: number; y: number; width: number; height: number}
  readonly selectedIds?: ReadonlyArray<string>
  readonly onSelect?: (id: string) => void
  readonly onTransform?: (id: string, patch: SpatialTransformPatch) => void
  readonly onTransformStart?: () => void
  readonly tool?: SpatialPreviewTool
}

const DEFAULT_ORBIT: SpatialPreviewOrbit = {pitch: -25, yaw: 35}
const PREVIEW_RESOLUTION = 10
const COORDINATES = 3
const DRAG_DEGREES_PER_PIXEL = 0.5
const KEYBOARD_DEGREES = 15
const DEFAULT_BOUNDS = 100
const MOVE_PIXELS_PER_BOUNDS = 400
const SCALE_PIXELS = 200
const MIN_SCALE_RATIO = 0.05
const MOVE_HANDLE_PIXELS = 64
const DEGREES_PER_HALF_TURN = 180
const EMPTY_PARTS: ReadonlyArray<PuppetPart> = []
const AXIS_INDEX: Record<SpatialGizmoAxis, number> = {x: 0, y: 1, z: 2}
const AXIS_KEY_SIGNS: Record<string, number> = {
  ' ': 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: 1,
  Enter: 1,
}

const createPreviewMesh = (
  objects: ReadonlyArray<PuppetSpatialObject> | undefined,
  operations: ReadonlyArray<PuppetSpatialPrimitive> | undefined,
): SpatialPreviewMesh | undefined => {
  if (objects === undefined) {
    return generateSpatialMesh({operations, resolution: PREVIEW_RESOLUTION})
  }
  const parts = objects
    .filter((object) => object.visible)
    .flatMap((object) => {
      try {
        return [
          {
            id: object.id,
            mesh: generateSpatialMesh({objects: [object], resolution: PREVIEW_RESOLUTION}),
          },
        ]
      } catch {
        return []
      }
    })
  const vertices: number[] = []
  const indices: number[] = []
  const ranges: {
    id: string
    start: number
    end: number
    vertexStart: number
    vertexEnd: number
  }[] = []
  for (const part of parts) {
    const offset = vertices.length / COORDINATES
    const start = indices.length / COORDINATES
    vertices.push(...part.mesh.vertices)
    indices.push(...part.mesh.indices.map((index) => index + offset))
    ranges.push({
      end: indices.length / COORDINATES,
      id: part.id,
      start,
      vertexEnd: vertices.length / COORDINATES,
      vertexStart: offset,
    })
  }
  return vertices.length === 0
    ? undefined
    : {indices, ranges, source: {kind: 'imported' as const, name: 'preview'}, vertices}
}

interface TransformOptions {
  readonly bounds: SpatialMeshPreviewProps['bounds']
  readonly dx: number
  readonly dy: number
  readonly object: EditableSpatialObject
  readonly tool?: SpatialPreviewTool
}

const transformPatch = (options: TransformOptions): SpatialTransformPatch | undefined => {
  const {bounds, dx, dy, object} = options
  switch (options.tool) {
    case 'move': {
      const distance =
        Math.max(bounds?.width ?? DEFAULT_BOUNDS, bounds?.height ?? DEFAULT_BOUNDS) /
        MOVE_PIXELS_PER_BOUNDS
      return {
        center: [
          object.center[0] + dx * distance,
          object.center[1] + dy * distance,
          object.center[2],
        ],
      }
    }
    case 'rotate':
      return {
        rotation: [
          object.rotation[0] + dy * DRAG_DEGREES_PER_PIXEL,
          object.rotation[1] + dx * DRAG_DEGREES_PER_PIXEL,
          object.rotation[2],
        ],
      }
    case 'scale': {
      const ratio = Math.max(MIN_SCALE_RATIO, 1 + (dx - dy) / SCALE_PIXELS)
      return {size: object.size.map((value) => value * ratio) as [number, number, number]}
    }
    case 'orbit':
    case undefined:
      return undefined
  }
}

const keyboardOrbit = (
  current: SpatialPreviewOrbit,
  key: string,
): SpatialPreviewOrbit | undefined => {
  const changes: Record<string, SpatialPreviewOrbit> = {
    ArrowDown: {pitch: current.pitch + KEYBOARD_DEGREES, yaw: current.yaw},
    ArrowLeft: {pitch: current.pitch, yaw: current.yaw - KEYBOARD_DEGREES},
    ArrowRight: {pitch: current.pitch, yaw: current.yaw + KEYBOARD_DEGREES},
    ArrowUp: {pitch: current.pitch - KEYBOARD_DEGREES, yaw: current.yaw},
    Home: DEFAULT_ORBIT,
  }
  return changes[key]
}

const faceContainsSelection = (
  objects: ReadonlyArray<PuppetSpatialObject> | undefined,
  rootId: string | undefined,
  selectedIds: ReadonlyArray<string> | undefined,
): boolean => {
  if (rootId === undefined || selectedIds === undefined) {
    return false
  }
  const root = objects?.find((object) => object.id === rootId)
  return selectedIds.some(
    (id) =>
      id === rootId ||
      (root?.kind === 'group' && findSpatialEditorObject(root.children, id) !== undefined),
  )
}

const selectedEditable = (
  ids: ReadonlyArray<string> | undefined,
  objects: ReadonlyArray<PuppetSpatialObject> | undefined,
) => {
  const id = ids?.at(-1)
  const selected = id === undefined ? undefined : findSpatialEditorObject(objects ?? [], id)
  return selected?.kind === 'group' ? undefined : selected
}

const selectedPivot = (
  selected: PuppetSpatialObject | undefined,
  mesh: SpatialPreviewMesh | undefined,
  position?: readonly [number, number, number],
): readonly [number, number, number] | undefined =>
  mesh !== undefined && selected !== undefined && selected.kind !== 'group' && selected.visible
    ? [
        selected.center[0] + (position?.[0] ?? 0),
        selected.center[1] + (position?.[1] ?? 0),
        selected.center[2] + (position?.[2] ?? 0),
      ]
    : undefined

interface AxisPatchOptions {
  readonly axis: SpatialGizmoAxis
  readonly gizmo: SpatialPreviewGizmo
  readonly object: EditableSpatialObject
  readonly tool?: SpatialPreviewTool
  readonly startX: number
  readonly startY: number
  readonly x: number
  readonly y: number
}

const axisPatch = (options: AxisPatchOptions): SpatialTransformPatch | undefined => {
  const {axis, gizmo, object, tool, startX, startY, x, y} = options
  const index = AXIS_INDEX[axis]
  if (tool === 'move') {
    const end = gizmo.handles.find((handle) => handle.axis === axis)?.end
    if (end === undefined) {
      return undefined
    }
    const directionX = end.x - gizmo.center.x
    const directionY = end.y - gizmo.center.y
    const lengthSquared = directionX ** 2 + directionY ** 2
    const distance =
      lengthSquared < 1
        ? ((y - startY) * gizmo.worldLength) / MOVE_HANDLE_PIXELS
        : (((x - startX) * directionX + (y - startY) * directionY) / lengthSquared) *
          gizmo.worldLength
    const center = [...object.center] as [number, number, number]
    center[index] += distance
    return {center}
  }
  if (tool === 'rotate') {
    const start = Math.atan2(startY - gizmo.center.y, startX - gizmo.center.x)
    const end = Math.atan2(y - gizmo.center.y, x - gizmo.center.x)
    const radians = Math.atan2(Math.sin(end - start), Math.cos(end - start))
    const rotation = [...object.rotation] as [number, number, number]
    rotation[index] += (radians * DEGREES_PER_HALF_TURN) / Math.PI
    return {rotation}
  }
  return undefined
}

const useMeshPreviewRenderer = (
  props: SpatialMeshPreviewProps,
  previewElement: Accessor<HTMLCanvasElement | undefined>,
  mesh: Accessor<SpatialPreviewMesh | undefined>,
  orbit: Accessor<SpatialPreviewOrbit>,
) => {
  const [previewRenderer, setPreviewRenderer] = createSignal<SpatialMeshPreviewRenderer>()
  const [gizmo, setGizmo] = createSignal<SpatialPreviewGizmo>()
  const [renderError, setRenderError] = createSignal<string>()
  createEffect(() => {
    const canvas = previewElement()
    if (!props.isOpen || canvas === undefined) {
      return
    }
    try {
      const renderer = createSpatialMeshPreviewRenderer(canvas)
      setRenderError(undefined)
      setPreviewRenderer(renderer)
      const observer =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(() => setGizmo(renderer.resize()))
      observer?.observe(canvas)
      onCleanup(() => {
        observer?.disconnect()
        setPreviewRenderer(undefined)
        setGizmo(undefined)
        renderer.destroy()
      })
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : '3D 미리보기를 시작할 수 없습니다.')
    }
  })
  createEffect(() => {
    const renderer = previewRenderer()
    if (renderer === undefined) {
      return
    }
    const currentMesh = mesh()
    const {selectedIds} = props
    const selectedId = selectedIds?.at(-1)
    const selected =
      selectedId === undefined
        ? undefined
        : findSpatialEditorObject(props.objects ?? [], selectedId)
    const pivot = selectedPivot(selected, currentMesh, props.meshPosition)
    const mutedIds = new Set(
      selectedIds === undefined || selectedIds.length === 0
        ? []
        : currentMesh?.ranges
            ?.filter((range) => !faceContainsSelection(props.objects, range.id, selectedIds))
            .map((range) => range.id),
    )
    setGizmo(
      renderer.render({
        mesh: currentMesh,
        mutedIds,
        orbit: orbit(),
        pivot,
        referenceParts: props.referenceParts ?? EMPTY_PARTS,
        targetBounds: props.targetBounds,
      }),
    )
  })
  return {gizmo, previewRenderer, renderError}
}

interface PreviewDragOptions {
  readonly gizmo: Accessor<SpatialPreviewGizmo | undefined>
  readonly orbit: Accessor<SpatialPreviewOrbit>
  readonly previewElement: Accessor<HTMLCanvasElement | undefined>
  readonly previewRenderer: Accessor<SpatialMeshPreviewRenderer | undefined>
  readonly props: SpatialMeshPreviewProps
  readonly setOrbit: Setter<SpatialPreviewOrbit>
}

const usePreviewDrag = ({
  gizmo,
  orbit,
  previewElement,
  previewRenderer,
  props,
  setOrbit,
}: PreviewDragOptions) => {
  let drag:
    | {
        pointerId: number
        x: number
        y: number
        orbit: SpatialPreviewOrbit
        object?: EditableSpatialObject
        axis?: SpatialGizmoAxis
        gizmo?: SpatialPreviewGizmo
      }
    | undefined
  const startDrag = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    const targetId = previewRenderer()?.pick(event.clientX, event.clientY)
    const selectedId = props.selectedIds?.at(-1)
    const keepChild = faceContainsSelection(
      props.objects,
      targetId,
      selectedId === undefined ? [] : [selectedId],
    )
    const id = keepChild ? selectedId : (targetId ?? selectedId)
    if (targetId !== undefined && !keepChild) {
      props.onSelect?.(targetId)
    }
    const selected = id === undefined ? undefined : findSpatialEditorObject(props.objects ?? [], id)
    const object = props.tool !== 'orbit' && selected?.kind !== 'group' ? selected : undefined
    if (object !== undefined) {
      props.onTransformStart?.()
    }
    drag = {object, orbit: orbit(), pointerId: event.pointerId, x: event.clientX, y: event.clientY}
    previewElement()?.setPointerCapture?.(event.pointerId)
  }
  const startAxisDrag = (event: PointerEvent, axis: SpatialGizmoAxis) => {
    const selected = selectedEditable(props.selectedIds, props.objects)
    const projected = gizmo()
    if (
      event.button !== 0 ||
      selected === undefined ||
      projected === undefined ||
      (props.tool !== 'move' && props.tool !== 'rotate')
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    props.onTransformStart?.()
    drag = {
      axis,
      gizmo: projected,
      object: selected,
      orbit: orbit(),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    ;(event.currentTarget as SVGPathElement | null)?.setPointerCapture?.(event.pointerId)
  }
  const handleAxisKeyDown = (event: KeyboardEvent, axis: SpatialGizmoAxis) => {
    const sign = AXIS_KEY_SIGNS[event.key] ?? 0
    if (sign === 0) {
      return
    }
    const selected = selectedEditable(props.selectedIds, props.objects)
    if (selected === undefined) {
      return
    }
    event.preventDefault()
    props.onTransformStart?.()
    const index = AXIS_INDEX[axis]
    if (props.tool === 'move') {
      const center = [...selected.center] as [number, number, number]
      const extent = Math.max(
        props.bounds?.width ?? DEFAULT_BOUNDS,
        props.bounds?.height ?? DEFAULT_BOUNDS,
      )
      center[index] += (sign * extent) / DEFAULT_BOUNDS
      props.onTransform?.(selected.id, {center})
    } else if (props.tool === 'rotate') {
      const rotation = [...selected.rotation] as [number, number, number]
      rotation[index] += sign * KEYBOARD_DEGREES
      props.onTransform?.(selected.id, {rotation})
    }
  }
  const moveDrag = (event: PointerEvent) => {
    if (drag === undefined || drag.pointerId !== event.pointerId) {
      return
    }
    if (drag.object !== undefined) {
      const patch =
        drag.axis === undefined
          ? transformPatch({
              bounds: props.bounds,
              dx: event.clientX - drag.x,
              dy: event.clientY - drag.y,
              object: drag.object,
              tool: props.tool,
            })
          : drag.gizmo === undefined
            ? undefined
            : axisPatch({
                axis: drag.axis,
                gizmo: drag.gizmo,
                object: drag.object,
                startX: drag.x,
                startY: drag.y,
                tool: props.tool,
                x: event.clientX,
                y: event.clientY,
              })
      if (patch !== undefined) {
        props.onTransform?.(drag.object.id, patch)
        return
      }
    }
    setOrbit({
      pitch: drag.orbit.pitch + (event.clientY - drag.y) * DRAG_DEGREES_PER_PIXEL,
      yaw: drag.orbit.yaw + (event.clientX - drag.x) * DRAG_DEGREES_PER_PIXEL,
    })
  }
  const stopDrag = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) {
      drag = undefined
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const next = keyboardOrbit(orbit(), event.key)
    if (next === undefined) {
      return
    }
    event.preventDefault()
    setOrbit(next)
  }
  return {handleAxisKeyDown, handleKeyDown, moveDrag, startAxisDrag, startDrag, stopDrag}
}

/** Displays an orbitable, grayscale preview and emits selected shape transforms. */
export const SpatialMeshPreview = (props: SpatialMeshPreviewProps) => {
  const [previewElement, setPreviewElement] = createSignal<HTMLCanvasElement>()
  const [orbit, setOrbit] = createSignal<SpatialPreviewOrbit>(DEFAULT_ORBIT)
  createEffect(() => {
    if (props.isOpen) {
      setOrbit(DEFAULT_ORBIT)
    }
  })
  const mesh = createMemo(() => {
    try {
      const preview = createPreviewMesh(props.objects, props.operations)
      if (preview === undefined) {
        return undefined
      }
      const placed = placeSpatialMesh(preview, props.meshPosition)
      return placed === preview ? preview : {...preview, vertices: placed.vertices}
    } catch {
      return undefined
    }
  })
  const {gizmo, previewRenderer, renderError} = useMeshPreviewRenderer(
    props,
    previewElement,
    () => mesh(),
    orbit,
  )
  const reset = () => setOrbit(DEFAULT_ORBIT)
  const {handleAxisKeyDown, handleKeyDown, moveDrag, startAxisDrag, startDrag, stopDrag} =
    usePreviewDrag({
      gizmo,
      orbit,
      previewElement,
      previewRenderer,
      props,
      setOrbit,
    })
  return (
    <section aria-label="3D 메시 미리보기" class="spatial-mesh-preview">
      <div class="spatial-mesh-preview-stage">
        <canvas
          ref={setPreviewElement}
          aria-label="3D 메시 회전 미리보기"
          aria-description={TOOL_HINTS[props.tool ?? 'orbit']}
          role="group"
          tabindex={0}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          on:keydown={handleKeyDown}
        />
        <Show when={props.tool === 'move' || props.tool === 'rotate' ? gizmo() : undefined}>
          {(projected) => (
            <SpatialPreviewGizmoOverlay
              gizmo={projected()}
              tool={props.tool}
              onAxisDown={startAxisDrag}
              onAxisKeyDown={handleAxisKeyDown}
              onMove={moveDrag}
              onStop={stopDrag}
            />
          )}
        </Show>
        <EditorButton class="spatial-mesh-preview-reset" type="button" onClick={reset}>
          시점 초기화
        </EditorButton>
        {renderError() && (
          <p class="spatial-mesh-preview-error" role="alert">
            {renderError()}
          </p>
        )}
      </div>
    </section>
  )
}
