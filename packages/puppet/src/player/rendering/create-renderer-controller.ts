import {createRendererLayout} from './create-renderer-layout'
import {supportsWgpuDocument} from './wgpu/supports-document'
import type {ComputedRenderFrame} from '../internal/compute-render-frame'
import type {PlayerRendererChange, PlayerRendererConfiguration} from '../rendering-options'
import {
  createPlayerRenderer,
  type CreatePlayerRendererOptions,
  type PlayerRenderer,
} from './create-player-renderer'

export interface RendererController extends PlayerRenderer {
  /** Observes applied device replacements; the caller owns the returned unsubscribe function. */
  readonly subscribeChange?: (listener: () => void) => () => void

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

type RendererFactory = (options: CreatePlayerRendererOptions) => Promise<PlayerRenderer>

const wgpuUnavailable = (configuration: CreatePlayerRendererOptions): string | undefined => {
  if (
    typeof Worker === 'undefined' ||
    typeof navigator === 'undefined' ||
    navigator.gpu === undefined
  ) {
    return 'The wgpu renderer requires WebGPU and Worker support'
  }
  if (!supportsWgpuDocument(configuration.document)) {
    return 'The wgpu renderer does not support this document'
  }
  return undefined
}

const prepareWebRenderer = async (
  configuration: CreatePlayerRendererOptions,
): Promise<PlayerRenderer> => {
  const preference = configuration.renderer ?? 'auto'
  const automatic = preference === 'auto'
  if (automatic ? configuration.gpuPresentation === 'worker-canvas' : preference !== 'wgpu') {
    return createPlayerRenderer(configuration)
  }
  const unavailable = wgpuUnavailable(configuration)
  if (unavailable !== undefined) {
    if (automatic) {
      return createPlayerRenderer(configuration)
    }
    throw new Error(unavailable)
  }
  try {
    const {createWgpuRenderer} = await import('./wgpu/create-renderer')
    return await createWgpuRenderer(configuration)
  } catch (cause) {
    if (!automatic) {
      throw cause
    }
    console.warn('Rust/wgpu initialization failed; using Pixi.', cause)
    return createPlayerRenderer(configuration)
  }
}

interface Preparation {
  readonly active: () => boolean
  readonly create: (document: CreatePlayerRendererOptions['document']) => Promise<PlayerRenderer>
  readonly document: () => CreatePlayerRendererOptions['document']
}
/** Coalesces document edits received while a replacement GPU backend initializes. */
const prepareCurrentDocument = async (options: Preparation): Promise<PlayerRenderer> => {
  let source = options.document()
  let prepared: PlayerRenderer | undefined = await options.create(source)
  try {
    // Initialization yields to document edits, cancellation and destruction.
    /* eslint-disable no-unmodified-loop-condition -- Flags change during awaited initialization. */
    while (options.active()) {
      const document = options.document()
      if (source === document || prepared.updateDocument(document)) {
        return prepared
      }
      prepared.destroy()
      prepared = undefined
      source = document
      // eslint-disable-next-line no-await-in-loop -- Coalesce edits received during resource creation.
      prepared = await options.create(source)
    }
    /* eslint-enable no-unmodified-loop-condition */
    return prepared
  } catch (cause) {
    prepared?.destroy()
    throw cause
  }
}

/** Replaces GPU resources while the player retains its playback, physics and input state. */
// eslint-disable-next-line max-lines-per-function -- One owner coordinates replacement, layout and pending document state.
export const createRendererController = async (
  options: CreatePlayerRendererOptions,
  createInitialRenderer: RendererFactory = prepareWebRenderer,
): Promise<RendererController> => {
  let current = await createInitialRenderer(options)
  const layout = createRendererLayout(options, () => current)
  let {document} = options
  let pendingDocument: typeof document | undefined
  let frame: Parameters<PlayerRenderer['applyFrame']> | undefined
  let preparedFrame: ComputedRenderFrame['frame'] | undefined
  let disposed = false
  const listeners = new Set<() => void>()
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
      prepared = await prepareCurrentDocument({
        active: () => !disposed && request === generation,
        create: (document) =>
          prepareWebRenderer({
            ...options,
            ...configuration,
            document,
            resolution: layout.resolution(),
          }),
        document: () => document,
      })
      if (disposed || request !== generation) {
        prepared.destroy()
        return disposed ? 'destroyed' : 'superseded'
      }
      layout.apply(prepared)
      if (frame !== undefined) {
        prepared.applyFrame(...frame)
      } else if (preparedFrame !== undefined) {
        prepared.applyPreparedFrame(captureFrameVertices(document, current, preparedFrame))
      }
      prepared.redraw()
      await prepared.flush?.()
      if (disposed || request !== generation) {
        prepared.destroy()
        return disposed ? 'destroyed' : 'superseded'
      }
      layout.connect(prepared)
      if (pendingDocument !== undefined) {
        prepared.updateDocument(pendingDocument, true)
      }
      const previous = current
      current = prepared
      prepared = undefined
      previous.destroy()
      layout.resume()
      listeners.forEach((listener) => listener())
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
    cancelPresentation: () => current.cancelPresentation?.(),
    configure,
    connectGeometry: async () => current.connectGeometry?.(),
    destroy() {
      if (!disposed) {
        disposed = true
        generation += 1
        listeners.clear()
        current.destroy()
      }
    },
    flush: () => current.flush?.() ?? Promise.resolve(),
    getPaintOrder: () => current.getPaintOrder(),
    getPartVertices: (partId) => current.getPartVertices(partId),
    getRenderingInfo: () => current.getRenderingInfo(),
    get hitTestDisplayed() {
      return current.hitTestDisplayed
    },
    get nativePlayback() {
      return current.nativePlayback
    },
    pickPart: (point) => current.pickPart(point),
    prepareFrame: (frame) => current.prepareFrame?.(frame),
    get presentFrame() {
      const owner = current
      if (owner.presentFrame === undefined) {
        return undefined
      }
      return async (nextFrame: ComputedRenderFrame) => {
        const result = await owner.presentFrame!(nextFrame)
        if (disposed) {
          return 'destroyed'
        }
        if (current !== owner) {
          return 'superseded'
        }
        if (result === 'presented') {
          commitPending()
          frame = undefined
          preparedFrame = nextFrame.frame
        }
        return result
      }
    },
    redraw: () => current.redraw(),
    releasePreparedFrame: (frame) => current.releasePreparedFrame?.(frame),
    resize: layout.resize,
    setFit(nextFit) {
      if (!disposed) {
        layout.setFit(nextFit)
      }
    },
    setRunning: layout.setRunning,
    setViewCamera: layout.setViewCamera,
    subscribeChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    subscribeFrame: layout.subscribeFrame,
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
