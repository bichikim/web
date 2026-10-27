import type {ViewportView as RuntimeView} from '../viewport/types'
import {attachViewPan} from './attach-view-pan'
import {attachViewNavigation} from './view-navigation'
import {ViewRuler} from './ViewRuler'
import {createEffect, createSignal, type JSX, on, onCleanup, untrack} from 'solid-js'
import {ViewCameraControls} from './ViewCameraControls'
import {MAXIMUM_VIEW_ZOOM, MINIMUM_VIEW_ZOOM, type ViewCamera} from './view-camera'
import {EDITOR_VIEWPORT_PADDING} from './viewport'
import {useElementSize} from './use-element-size'

interface CameraViewportProps {
  /** Saved camera state; omitted, retain the current view. */
  readonly view?: RuntimeView
  /** Reports navigation and fitting changes. Omitted, camera remains local. */
  readonly onViewChange?: (view: RuntimeView) => void
  /** Reports the CSS scale so the canvas can match its displayed pixel density. */
  readonly onZoomChange?: (zoom: number) => void
  readonly fitRevision?: unknown
  readonly width: number
  readonly height: number
  readonly children: JSX.Element
  readonly controls?: JSX.Element
  readonly viewControls?: JSX.Element
}

export const CameraViewport = (props: CameraViewportProps) => {
  const GRID_STEP = 20
  const [camera, setCamera] = createSignal<ViewCamera>({x: 0, y: 0, zoom: 1})
  const [viewport, setViewport] = createSignal<HTMLDivElement | null>(null)
  const size = useElementSize(viewport)
  const [fitted, setFitted] = createSignal(true)
  const [dragging, setDragging] = createSignal(false)
  createEffect(() => {
    const zoom = camera().zoom
    untrack(() => props.onZoomChange?.(zoom))
  })
  const navigate = (nextCamera: ViewCamera) => {
    setFitted(false)
    setCamera(nextCamera)
    untrack(() => props.onViewChange?.({camera: nextCamera, fitted: false}))
  }
  const fit = () => {
    const element = viewport()
    if (element === null || element.clientWidth === 0 || element.clientHeight === 0) {
      return
    }
    setFitted(true)
    const nextCamera = {
      x: 0,
      y: 0,
      zoom: Math.max(
        MINIMUM_VIEW_ZOOM,
        Math.min(
          MAXIMUM_VIEW_ZOOM,
          element.clientWidth / props.width,
          element.clientHeight / props.height,
        ),
      ),
    }
    setCamera(nextCamera)
    untrack(() => props.onViewChange?.({camera: nextCamera, fitted: true}))
  }
  let appliedView: RuntimeView | undefined
  createEffect(
    on(
      () => props.view,
      (view) => {
        if (view !== undefined && view !== appliedView) {
          appliedView = view
          setCamera(view.camera)
          setFitted(view.fitted)
        }
      },
    ),
  )
  createEffect(() => {
    const measured = size()
    if (fitted() && measured.width > 0 && measured.height > 0) {
      untrack(fit)
    }
  })
  createEffect(() => {
    const element = viewport()
    if (element !== null) {
      onCleanup(attachViewNavigation({camera, element, onChange: navigate}))
      onCleanup(attachViewPan({camera, element, onChange: navigate, onPanningChange: setDragging}))
    }
  })
  let fittedRevision: unknown
  createEffect(
    on(
      () => props.fitRevision,
      () => {
        if (props.fitRevision !== undefined && props.fitRevision !== fittedRevision) {
          fittedRevision = props.fitRevision
          untrack(fit)
        }
      },
    ),
  )
  return (
    <>
      <div class="camera-frame">
        <div class="ruler-corner" aria-hidden="true">
          px
        </div>
        <ViewRuler offset={camera().x} zoom={camera().zoom} />
        <ViewRuler vertical offset={camera().y} zoom={camera().zoom} />
        <div
          class="viewport workspace-camera"
          role="region"
          aria-label="모델 보기"
          ref={setViewport}
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
          onChange={navigate}
          onFit={fit}
        />
      </div>
    </>
  )
}
