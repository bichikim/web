import {type Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {EditorButton} from '../../design-system'
import {generateSpatialMesh} from '../../deformation/generate-spatial-mesh'
import type {
  PuppetSpatialObject,
  PuppetSpatialPrimitive,
  PuppetSpatialPrimitiveObject,
} from '../../player'
import {findSpatialEditorObject} from './spatial-editor-objects'
import {
  createSpatialMeshPreviewRenderer,
  type SpatialMeshPreviewRenderer,
  type SpatialPreviewMesh,
  type SpatialPreviewOrbit,
} from './spatial-mesh-preview-renderer'

export type SpatialPreviewTool = 'orbit' | 'move' | 'rotate' | 'scale'

interface SpatialMeshPreviewProps {
  readonly bounds?: {x: number; y: number; width: number; height: number}
  readonly isOpen: boolean
  readonly objects?: ReadonlyArray<PuppetSpatialObject>
  readonly operations?: ReadonlyArray<PuppetSpatialPrimitive>
  readonly selectedIds?: ReadonlyArray<string>
  readonly onSelect?: (id: string) => void
  readonly onTransform?: (id: string, patch: Partial<PuppetSpatialPrimitiveObject>) => void
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
  readonly object: PuppetSpatialPrimitiveObject
  readonly tool?: SpatialPreviewTool
}

const transformPatch = (
  options: TransformOptions,
): Partial<PuppetSpatialPrimitiveObject> | undefined => {
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

const useMeshPreviewRenderer = (
  props: SpatialMeshPreviewProps,
  previewElement: Accessor<HTMLCanvasElement | undefined>,
  mesh: Accessor<SpatialPreviewMesh | undefined>,
  orbit: Accessor<SpatialPreviewOrbit>,
) => {
  const [previewRenderer, setPreviewRenderer] = createSignal<SpatialMeshPreviewRenderer>()
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
          : new ResizeObserver(() => renderer.resize())
      observer?.observe(canvas)
      onCleanup(() => {
        observer?.disconnect()
        setPreviewRenderer(undefined)
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
    const mutedIds = new Set(
      selectedIds === undefined || selectedIds.length === 0
        ? []
        : currentMesh?.ranges
            ?.filter((range) => !faceContainsSelection(props.objects, range.id, selectedIds))
            .map((range) => range.id),
    )
    renderer.render({mesh: currentMesh, mutedIds, orbit: orbit()})
  })
  return {previewRenderer, renderError}
}

/** Displays an orbitable, grayscale preview and emits selected shape transforms. */
export const SpatialMeshPreview = (props: SpatialMeshPreviewProps) => {
  const [previewElement, setPreviewElement] = createSignal<HTMLCanvasElement>()
  let drag:
    | {
        pointerId: number
        x: number
        y: number
        orbit: SpatialPreviewOrbit
        object?: PuppetSpatialPrimitiveObject
      }
    | undefined
  const [orbit, setOrbit] = createSignal<SpatialPreviewOrbit>(DEFAULT_ORBIT)
  createEffect(() => {
    if (props.isOpen) {
      setOrbit(DEFAULT_ORBIT)
    }
  })
  const mesh = createMemo(() => {
    try {
      return createPreviewMesh(props.objects, props.operations)
    } catch {
      return undefined
    }
  })
  const {previewRenderer, renderError} = useMeshPreviewRenderer(
    props,
    previewElement,
    () => mesh(),
    orbit,
  )
  const reset = () => setOrbit(DEFAULT_ORBIT)
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
    const object = props.tool !== 'orbit' && selected?.kind === 'primitive' ? selected : undefined
    if (object !== undefined) {
      props.onTransformStart?.()
    }
    drag = {object, orbit: orbit(), pointerId: event.pointerId, x: event.clientX, y: event.clientY}
    previewElement()?.setPointerCapture?.(event.pointerId)
  }
  const moveDrag = (event: PointerEvent) => {
    if (drag === undefined || drag.pointerId !== event.pointerId) {
      return
    }
    if (drag.object !== undefined) {
      const patch = transformPatch({
        bounds: props.bounds,
        dx: event.clientX - drag.x,
        dy: event.clientY - drag.y,
        object: drag.object,
        tool: props.tool,
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
  return (
    <section aria-label="3D 메시 미리보기" class="spatial-mesh-preview">
      <canvas
        ref={setPreviewElement}
        aria-label="3D 메시 회전 미리보기"
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
      {renderError() && <p role="alert">{renderError()}</p>}
      <div class="spatial-mesh-preview-toolbar">
        <p>드래그하거나 방향키로 회전 · Home으로 초기화</p>
        <EditorButton type="button" onClick={reset}>
          시점 초기화
        </EditorButton>
      </div>
      <p>
        {props.tool === undefined || props.tool === 'orbit'
          ? '시점 회전은 메시 형태를 바꾸지 않습니다.'
          : '선택한 도형을 드래그해 변형합니다. Z 값과 세 축의 정확한 값은 오른쪽에서 조정하세요.'}
      </p>
    </section>
  )
}
