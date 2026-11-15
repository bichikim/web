import type {PlayerViewCamera, PuppetLayout} from '@winter-love/puppet/player'

export interface ViewportSize {
  readonly width: number
  readonly height: number
}

export interface CameraGesture {
  readonly x: number
  readonly y: number
  readonly span: number
}

interface FitCameraOptions {
  readonly layout: PuppetLayout
  readonly viewport: ViewportSize
}

export const fitCamera = (options: FitCameraOptions): PlayerViewCamera => {
  const FIT_SCALE = 0.94
  const zoom =
    Math.min(
      options.viewport.width / options.layout.width,
      options.viewport.height / options.layout.height,
    ) * FIT_SCALE
  return {
    x: options.layout.x + (options.layout.width - options.viewport.width / zoom) / 2,
    y: options.layout.y + (options.layout.height - options.viewport.height / zoom) / 2,
    zoom,
  }
}

interface TransformCameraOptions {
  readonly camera: PlayerViewCamera
  readonly from: CameraGesture
  readonly to: CameraGesture
  readonly minimum: number
  readonly maximum: number
}

export const transformCamera = (options: TransformCameraOptions): PlayerViewCamera => {
  const factor = options.from.span > 0 ? options.to.span / options.from.span : 1
  const zoom = Math.max(options.minimum, Math.min(options.maximum, options.camera.zoom * factor))
  return {
    x: options.camera.x + options.from.x / options.camera.zoom - options.to.x / zoom,
    y: options.camera.y + options.from.y / options.camera.zoom - options.to.y / zoom,
    zoom,
  }
}

interface ReframeCameraOptions {
  readonly camera: PlayerViewCamera
  readonly from: ViewportSize
  readonly to: ViewportSize
  readonly zoom: number
}

export const reframeCamera = (options: ReframeCameraOptions): PlayerViewCamera => ({
  x:
    options.camera.x +
    options.from.width / options.camera.zoom / 2 -
    options.to.width / options.zoom / 2,
  y:
    options.camera.y +
    options.from.height / options.camera.zoom / 2 -
    options.to.height / options.zoom / 2,
  zoom: options.zoom,
})
