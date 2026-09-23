import {attachViewNavigation} from './view-navigation'
import {ViewRuler} from './ViewRuler'
import {createEffect, createSignal, type JSX, on, onCleanup, untrack} from 'solid-js'
import {ViewCameraControls} from './ViewCameraControls'
import {MAXIMUM_VIEW_ZOOM, MINIMUM_VIEW_ZOOM, type ViewCamera} from './view-camera'
import {EDITOR_VIEWPORT_PADDING} from './viewport'

interface CameraViewportProps {
  readonly fitRevision?: number
  readonly width: number
  readonly height: number
  readonly children: JSX.Element
  readonly controls?: JSX.Element
  readonly viewControls?: JSX.Element
}

export const CameraViewport = (props: CameraViewportProps) => {
  const GRID_STEP = 20
  const [camera, setCamera] = createSignal<ViewCamera>({x: 0, y: 0, zoom: 1})
  let viewport: HTMLDivElement | undefined
  let drag: {pointer: number; x: number; y: number; camera: ViewCamera} | undefined
  const [dragging, setDragging] = createSignal(false)
  const fit = () => {
    if (viewport === undefined || viewport.clientWidth === 0 || viewport.clientHeight === 0) {
      return
    }
    setCamera({
      x: 0,
      y: 0,
      zoom: Math.max(
        MINIMUM_VIEW_ZOOM,
        Math.min(
          MAXIMUM_VIEW_ZOOM,
          viewport.clientWidth / props.width,
          viewport.clientHeight / props.height,
        ),
      ),
    })
  }
  createEffect(
    on(
      () => props.fitRevision,
      () => {
        if (props.fitRevision !== undefined && props.fitRevision > 0) {
          untrack(fit)
        }
      },
    ),
  )
  const stop = () => {
    drag = undefined
    setDragging(false)
  }
  return (
    <>
      <div class="camera-frame">
        <div class="ruler-corner" aria-hidden="true">
          px
        </div>
        <ViewRuler offset={camera().x} zoom={camera().zoom} />
        <ViewRuler vertical offset={camera().y} zoom={camera().zoom} />
        <div
          class="viewport"
          role="region"
          aria-label="모델 보기"
          ref={(element) => {
            viewport = element
            onCleanup(attachViewNavigation({camera, element, onChange: setCamera}))
          }}
          data-panning={dragging()}
          style={{
            '--camera-grid': `${GRID_STEP * camera().zoom}px`,
            '--camera-x': `${-camera().x * camera().zoom}px`,
            '--camera-y': `${-camera().y * camera().zoom}px`,
            '--camera-zoom': camera().zoom,
            '--stage-height': `${props.height * (1 + 2 * EDITOR_VIEWPORT_PADDING)}px`,
            '--stage-width': `${props.width * (1 + 2 * EDITOR_VIEWPORT_PADDING)}px`,
            '--stage-x': `${(-camera().x - props.width * EDITOR_VIEWPORT_PADDING) * camera().zoom}px`,
            '--stage-y': `${(-camera().y - props.height * EDITOR_VIEWPORT_PADDING) * camera().zoom}px`,
          }}
          onPointerDown={(event) => {
            if (event.button !== 1) {
              return
            }
            event.preventDefault()
            drag = {camera: camera(), pointer: event.pointerId, x: event.clientX, y: event.clientY}
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }}
          onPointerMove={(event) => {
            if (drag === undefined || drag.pointer !== event.pointerId) {
              return
            }
            setCamera({
              ...drag.camera,
              x: drag.camera.x - (event.clientX - drag.x) / drag.camera.zoom,
              y: drag.camera.y - (event.clientY - drag.y) / drag.camera.zoom,
            })
          }}
          onPointerUp={(event) => {
            if (drag?.pointer === event.pointerId) {
              stop()
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
        >
          <div class="camera-stage">{props.children}</div>
          <div class="camera-origin" aria-hidden="true">
            <span>0, 0</span>
          </div>
          {props.controls}
        </div>
        <ViewCameraControls
          children={props.viewControls}
          camera={camera()}
          onChange={setCamera}
          onFit={fit}
        />
      </div>
    </>
  )
}
