import type {CreatePlayerRendererOptions, PlayerRenderer} from './create-player-renderer'
import type {PlayerViewCamera} from '../view-camera'

/** Retains view and clock settings across asynchronous GPU resource replacement. */
export const createRendererLayout = (
  options: CreatePlayerRendererOptions,
  renderer: () => PlayerRenderer,
) => {
  let {resolution} = options
  let fit = options.fit ?? 'contain'
  let camera: PlayerViewCamera | undefined
  let listener: ((delta: number) => void) | undefined
  let running = true
  return {
    apply(target: PlayerRenderer) {
      target.setRunning(false)
      target.resize(resolution)
      target.setFit(fit)
      if (camera !== undefined) {
        target.setViewCamera(camera)
      }
    },
    connect(target: PlayerRenderer) {
      if (listener !== undefined) {
        target.subscribeFrame(listener)
      }
    },
    resize(next: number | undefined) {
      resolution = next ?? resolution
      renderer().resize(next)
    },
    resolution: () => resolution,
    resume: () => {
      renderer().setRunning(running)
    },
    setFit(next: typeof fit) {
      fit = next
      renderer().setFit(next)
    },
    setRunning(next: boolean) {
      running = next
      renderer().setRunning(next)
    },
    setViewCamera(next: PlayerViewCamera) {
      camera = next
      renderer().setViewCamera(next)
    },
    subscribeFrame(next: (delta: number) => void) {
      listener = next
      renderer().subscribeFrame(next)
    },
  }
}
