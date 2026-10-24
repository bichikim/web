import type {EditorPoint} from './viewport'

export const MINIMUM_VIEW_ZOOM = 0.01
export const MAXIMUM_VIEW_ZOOM = 8

export interface ViewCamera extends EditorPoint {
  readonly zoom: number
}

/** Changes zoom while retaining the model coordinate under the viewport anchor. */
export const zoomViewCamera = (
  camera: ViewCamera,
  requested: number,
  anchor: EditorPoint,
): ViewCamera => {
  const zoom = Math.max(MINIMUM_VIEW_ZOOM, Math.min(MAXIMUM_VIEW_ZOOM, requested))
  return {
    x: camera.x + anchor.x / camera.zoom - anchor.x / zoom,
    y: camera.y + anchor.y / camera.zoom - anchor.y / zoom,
    zoom,
  }
}
