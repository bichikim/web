import type {CreatePlayerRendererOptions} from '../create-player-renderer'
import type {PuppetDocument} from '../../document'
import type {PlayerViewCamera} from '../../view-camera'
import type {DrawGpu} from './types'
import {fitDocument} from '../../internal/layout-player-root'

/** Shares the original document fitting and CSS-to-model coordinate conversion. */
export const createGpuView = (
  options: CreatePlayerRendererOptions,
  document: () => PuppetDocument,
) => {
  let resolution = options.resolution ?? Math.min(globalThis.devicePixelRatio || 1, 2)
  let camera: PlayerViewCamera | undefined
  let fit = options.fit ?? 'contain'
  let displayed: DrawGpu['view'] = [1, 1, 0, 0]
  const screen = () => {
    const target = options.resizeTo ?? options.canvas.parentElement ?? options.canvas
    return {
      height: Math.max(1, target.clientHeight || document().viewport.height),
      width: Math.max(1, target.clientWidth || document().viewport.width),
    }
  }
  return {
    pixels() {
      const size = screen()
      return {
        height: Math.max(1, Math.round(size.height * resolution)),
        width: Math.max(1, Math.round(size.width * resolution)),
      }
    },
    resize(next: number | undefined) {
      if (next !== undefined && Number.isFinite(next) && next > 0) {
        resolution = next
      }
    },
    setDisplayed(next: DrawGpu['view']) {
      displayed = next
    },
    setFit(next: typeof fit) {
      fit = next
    },
    setViewCamera(next: PlayerViewCamera) {
      camera = next
    },
    toDocumentPoint(point: {readonly x: number; readonly y: number}) {
      const size = screen()
      return {
        x: ((point.x / size.width) * 2 - 1 - displayed[2]) / displayed[0],
        y: (1 - (point.y / size.height) * 2 - displayed[3]) / displayed[1],
      }
    },
    transform(): DrawGpu['view'] {
      const size = screen()
      const transform =
        camera === undefined
          ? fitDocument({
              document: document(),
              fit,
              framing: options.framing,
              screen: size,
              viewportPadding: options.viewportPadding,
            })
          : {offset: {x: -camera.x * camera.zoom, y: -camera.y * camera.zoom}, scale: camera.zoom}
      const clipSpan = 2
      return [
        (clipSpan * transform.scale) / size.width,
        (-clipSpan * transform.scale) / size.height,
        (clipSpan * transform.offset.x) / size.width - 1,
        1 - (clipSpan * transform.offset.y) / size.height,
      ]
    },
  }
}
