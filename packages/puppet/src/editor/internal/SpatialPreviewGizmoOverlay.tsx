import {For} from 'solid-js'
import type {SpatialPreviewTool} from './SpatialMeshPreview'
import type {SpatialGizmoAxis, SpatialPreviewGizmo} from './spatial-preview-gizmo'

const AXIS_CLASSES: Record<SpatialGizmoAxis, string> = {
  x: 'spatial-mesh-preview-axis-x',
  y: 'spatial-mesh-preview-axis-y',
  z: 'spatial-mesh-preview-axis-z',
}
interface GizmoProps {
  readonly gizmo: SpatialPreviewGizmo
  readonly tool?: SpatialPreviewTool
  readonly onAxisDown: (event: PointerEvent, axis: SpatialGizmoAxis) => void
  readonly onAxisKeyDown: (event: KeyboardEvent, axis: SpatialGizmoAxis) => void
  readonly onMove: (event: PointerEvent) => void
  readonly onStop: (event: PointerEvent) => void
}

export const SpatialPreviewGizmoOverlay = (props: GizmoProps) => (
  <svg
    aria-label="선택한 도형의 3D 변형 축"
    role="group"
    class="spatial-mesh-preview-gizmo"
    viewBox={`0 0 ${props.gizmo.width} ${props.gizmo.height}`}
    onPointerMove={(event) => props.onMove(event)}
    onPointerUp={(event) => props.onStop(event)}
    onPointerCancel={(event) => props.onStop(event)}
    onLostPointerCapture={(event) => props.onStop(event)}
  >
    <For each={props.gizmo.handles}>
      {(handle) => {
        const path = () => (props.tool === 'rotate' ? handle.rotatePath : handle.movePath)
        return (
          <g class={AXIS_CLASSES[handle.axis]}>
            <path d={path()} class="spatial-mesh-preview-axis-outline" />
            <path d={path()} class="spatial-mesh-preview-axis-line" />
            <path
              d={path()}
              aria-label={`${handle.axis.toUpperCase()}축 ${props.tool === 'move' ? '이동' : '회전'}`}
              role="button"
              tabindex={0}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space"
              class="spatial-mesh-preview-axis-hit"
              onPointerDown={(event) => props.onAxisDown(event, handle.axis)}
              on:keydown={(event) => props.onAxisKeyDown(event, handle.axis)}
            />
            <text x={handle.end.x} y={handle.end.y} class="spatial-mesh-preview-axis-label">
              {handle.axis.toUpperCase()}
            </text>
          </g>
        )
      }}
    </For>
    <circle
      cx={props.gizmo.center.x}
      cy={props.gizmo.center.y}
      r="5"
      class="spatial-mesh-preview-gizmo-center"
    />
  </svg>
)
