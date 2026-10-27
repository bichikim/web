import type {PlayerRendererChange, PlayerRendererConfiguration} from '../rendering-options'
import type {PlayerViewCamera} from '../view-camera'
import {
  createPlayerRenderer,
  type CreatePlayerRendererOptions,
  type PlayerRenderer,
} from './create-player-renderer'

export interface RendererController extends PlayerRenderer {
  /** Latest request wins. Failure retains the current renderer and rejects with its cause. */
  configure(options: PlayerRendererConfiguration): Promise<PlayerRendererChange>
}

/** Replaces GPU resources while the player retains its playback, physics and input state. */
export const createRendererController = async (
  options: CreatePlayerRendererOptions,
): Promise<RendererController> => {
  let current = await createPlayerRenderer(options)
  let {document} = options
  let {resolution} = options
  let camera: PlayerViewCamera | undefined
  let frame: Parameters<PlayerRenderer['applyFrame']> | undefined
  let onFrame: ((deltaTime: number) => void) | undefined
  let running = true
  let disposed = false
  let generation = 0

  const configure = async (
    configuration: PlayerRendererConfiguration,
  ): Promise<PlayerRendererChange> => {
    if (disposed) {
      return 'destroyed'
    }
    generation += 1
    const request = generation
    let prepared: PlayerRenderer | undefined
    try {
      let source = document
      prepared = await createPlayerRenderer({
        ...options,
        ...configuration,
        document: source,
        resolution,
      })
      // New document resources cannot be prepared in parallel with an unknown future revision.
      /* eslint-disable no-unmodified-loop-condition -- Lifetime flags change during the awaited initialization. */
      while (
        !disposed &&
        request === generation &&
        source !== document &&
        !prepared.updateDocument(document)
      ) {
        prepared.destroy()
        prepared = undefined
        source = document
        // eslint-disable-next-line no-await-in-loop -- Coalesce edits that arrived during resource creation.
        prepared = await createPlayerRenderer({
          ...options,
          ...configuration,
          document: source,
          resolution,
        })
      }
      /* eslint-enable no-unmodified-loop-condition */
      if (disposed || request !== generation) {
        prepared.destroy()
        return disposed ? 'destroyed' : 'superseded'
      }
      prepared.setRunning(false)
      prepared.resize(resolution)
      if (camera !== undefined) {
        prepared.setViewCamera(camera)
      }
      if (frame !== undefined) {
        prepared.applyFrame(...frame)
      }
      prepared.redraw()
      if (onFrame !== undefined) {
        prepared.subscribeFrame(onFrame)
      }
      const previous = current
      current = prepared
      prepared = undefined
      previous.destroy()
      current.setRunning(running)
      return 'applied'
    } catch (cause) {
      prepared?.destroy()
      if (disposed || request !== generation) {
        return disposed ? 'destroyed' : 'superseded'
      }
      throw cause
    }
  }

  return {
    applyFrame(...nextFrame) {
      frame = nextFrame
      current.applyFrame(...nextFrame)
    },
    configure,
    destroy() {
      if (!disposed) {
        disposed = true
        generation += 1
        current.destroy()
      }
    },
    getPaintOrder: () => current.getPaintOrder(),
    getPartVertices: (partId) => current.getPartVertices(partId),
    getRenderingInfo: () => current.getRenderingInfo(),
    redraw: () => current.redraw(),
    resize(nextResolution) {
      resolution = nextResolution ?? resolution
      current.resize(nextResolution)
    },
    setRunning(nextRunning) {
      running = nextRunning
      current.setRunning(nextRunning)
    },
    setViewCamera(nextCamera) {
      camera = nextCamera
      current.setViewCamera(nextCamera)
    },
    subscribeFrame(listener) {
      onFrame = listener
      current.subscribeFrame(listener)
    },
    toDocumentPoint: (point) => current.toDocumentPoint(point),
    updateDocument(nextDocument) {
      if (!current.updateDocument(nextDocument)) {
        return false
      }
      document = nextDocument
      frame = undefined
      return true
    },
  }
}
