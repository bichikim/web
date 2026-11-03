import type {ComputedRenderFrame} from '../internal/compute-render-frame'
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

const captureFrameVertices = (
  document: CreatePlayerRendererOptions['document'],
  renderer: PlayerRenderer,
  frame: ComputedRenderFrame['frame'],
): ComputedRenderFrame => {
  const vertices = new Float32Array(
    document.parts.reduce((total, part) => total + part.mesh.vertices.length, 0),
  )
  let offset = 0
  for (const part of document.parts) {
    vertices.set(renderer.getPartVertices(part.id) ?? part.mesh.vertices, offset)
    offset += part.mesh.vertices.length
  }
  return {frame, vertices}
}

/** Replaces GPU resources while the player retains its playback, physics and input state. */
export const createRendererController = async (
  options: CreatePlayerRendererOptions,
): Promise<RendererController> => {
  let current = await createPlayerRenderer(options)
  let {document} = options
  let {resolution} = options
  let pendingDocument: typeof document | undefined
  let camera: PlayerViewCamera | undefined
  let frame: Parameters<PlayerRenderer['applyFrame']> | undefined
  let preparedFrame: ComputedRenderFrame['frame'] | undefined
  let onFrame: ((deltaTime: number) => void) | undefined
  let running = true
  let disposed = false
  let generation = 0

  const commitPending = () => {
    if (pendingDocument !== undefined) {
      document = pendingDocument
      pendingDocument = undefined
    }
  }
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
      } else if (preparedFrame !== undefined) {
        prepared.applyPreparedFrame(captureFrameVertices(document, current, preparedFrame))
      }
      prepared.redraw()
      if (onFrame !== undefined) {
        prepared.subscribeFrame(onFrame)
      }
      if (pendingDocument !== undefined) {
        prepared.updateDocument(pendingDocument, true)
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
      commitPending()
      preparedFrame = undefined
      frame = nextFrame
      current.applyFrame(...nextFrame)
    },
    applyPreparedFrame(nextFrame) {
      commitPending()
      frame = undefined
      preparedFrame = nextFrame.frame
      current.applyPreparedFrame(nextFrame)
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
    updateDocument(nextDocument, deferred = false) {
      const accepted = deferred
        ? current.updateDocument(nextDocument, true)
        : current.updateDocument(nextDocument)
      if (!accepted) {
        return false
      }
      if (deferred) {
        pendingDocument = nextDocument
        return true
      }
      pendingDocument = undefined
      document = nextDocument
      frame = undefined
      preparedFrame = undefined
      return true
    },
  }
}
