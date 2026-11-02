import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import {createBufferClock} from './create-buffer-clock'
import {createBufferWorker} from './create-buffer-worker'
import {
  type BufferedInput,
  type BufferFrame,
  PLAYER_BUFFER_FRAMES,
  type StaleBufferFrame,
} from './types'

interface CreateBufferSessionOptions {
  /** Immutable prepared geometry; textures and GPU resources remain with the host. */
  readonly document: PuppetDocument
  /** Decoded audio for numeric mouth analysis; omitted, no sounds are available. */
  readonly audio?: ReadonlyMap<string, PuppetSound>
  /** Last notification sequence delivered by the host; omitted, nothing has been delivered. */
  readonly acknowledged?: () => number
  /** Applies one frame synchronously before its transferable storage is recycled. */
  readonly onFrame: (frame: BufferFrame) => void
  /** Reports infrastructure failure; the owner chooses compatibility fallback. */
  readonly onError: () => void
  /** Latest unapplied controls, based on the last presented checkpoint. Omitted, predict only. */
  readonly input?: () => BufferedInput | undefined
  /** Whether simulation continues without input. Omitted, keep predicting. */
  readonly running?: () => boolean
}
const BUFFER_CAPACITY = 9

/** Owns one ordered Worker stream, prioritizing current input over speculative frames. */
// eslint-disable-next-line max-lines-per-function -- Cancellation, scheduling and transferable ownership share one stream.
export const createBufferSession = (options: CreateBufferSessionOptions) => {
  const worker = createBufferWorker(options.onError)
  let disposed = false
  let generation = 0
  let active = false
  let first = false
  let presenting = false
  let flight: {readonly generation: number} | undefined
  let animation: number | undefined
  let previousRefresh: number | undefined
  let origin = Date.now()
  let lastTime = origin
  let clock = createBufferClock(origin)
  let presentationDelay: number | undefined
  let frames: BufferFrame[] = []
  let pool: ArrayBuffer[] = []
  const isRunning = () => options.running?.() ?? true
  const ready = worker.initialize(options.document, options.audio).then((bytes) => {
    if (!disposed) {
      pool = Array.from({length: BUFFER_CAPACITY}, () => new ArrayBuffer(bytes))
    }
  })
  const release = (frame: BufferFrame | StaleBufferFrame) => {
    const buffer = frame.kind === 'frame' ? frame.computed.vertices.buffer : frame.buffer
    if (!disposed && buffer instanceof ArrayBuffer) {
      pool.push(buffer)
    }
  }
  const clearPredictions = () => {
    frames.forEach(release)
    frames = []
  }
  const invalidate = () => {
    generation += 1
    active = false
    if (animation !== undefined) {
      cancelAnimationFrame(animation)
    }
    animation = undefined
    clearPredictions()
  }
  const schedule = () => {
    if (active && !disposed && animation === undefined && frames.length > 0) {
      animation = requestAnimationFrame(tick)
    }
  }
  const pump = () => {
    if (!active || disposed || presenting || flight !== undefined) {
      return
    }
    const input = options.input?.()
    if (input !== undefined) {
      clearPredictions()
    }
    if ((input === undefined && !first && !isRunning()) || frames.length >= PLAYER_BUFFER_FRAMES) {
      return
    }
    const buffer = pool.pop()
    if (buffer === undefined) {
      return
    }
    const immediate = input !== undefined || !isRunning()
    if (input !== undefined) {
      clock.rebase(lastTime)
    }
    const prediction = isRunning()
      ? clock.next(Date.now() - (presentationDelay ?? 0))
      : {deltaTime: 0, time: lastTime}
    const request = {generation}
    const began = Date.now()
    first = false
    flight = request
    worker
      .produce({
        acknowledgedNotices: options.acknowledged?.(),
        buffer,
        ...prediction,
        generation,
        input,
      })
      .then((frame) => {
        if (flight === request) {
          flight = undefined
        }
        if (disposed) {
          return
        }
        if (
          !active ||
          request.generation !== generation ||
          frame.generation !== generation ||
          frame.kind === 'stale'
        ) {
          release(frame)
        } else {
          clock.observeCompute(Date.now() - began)
          if (immediate || !isRunning() || options.input?.() !== undefined) {
            clearPredictions()
            presenting = true
            // Host callbacks run outside the Worker promise rejection boundary.
            queueMicrotask(() => present(frame, request.generation))
          } else {
            frames.push(frame)
          }
        }
        pump()
        schedule()
      })
      .catch(() => {
        if (flight === request) {
          flight = undefined
        }
        if (!disposed && request.generation === generation) {
          options.onError()
        }
      })
  }
  function present(frame: BufferFrame, request: number) {
    try {
      if (!disposed && active && request === generation) {
        lastTime = frame.time
        presentationDelay ??= Math.max(0, Date.now() - lastTime)
        options.onFrame(frame)
      }
    } finally {
      presenting = false
      release(frame)
      if (!disposed && active && request === generation) {
        pump()
        schedule()
      }
    }
  }
  function tick() {
    animation = undefined
    if (disposed || !active) {
      return
    }
    const request = generation
    const now = Date.now()
    if (previousRefresh !== undefined) {
      clock.observeRefresh(now - previousRefresh)
    }
    previousRefresh = now
    if (presentationDelay === undefined && frames.length >= PLAYER_BUFFER_FRAMES) {
      presentationDelay = now - origin
    }
    const [entry] = frames
    if (
      entry !== undefined &&
      presentationDelay !== undefined &&
      entry.time + presentationDelay <= now
    ) {
      frames.shift()
      present(entry, request)
    }
    if (!disposed && active && request === generation) {
      pump()
      schedule()
    }
  }
  return {
    destroy() {
      disposed = true
      invalidate()
      worker.destroy()
      pool = []
    },
    invalidate,
    ready,
    refresh() {
      if (options.input?.() !== undefined) {
        clearPredictions()
      }
      pump()
      schedule()
    },
    resources: (sounds: ReadonlyMap<string, PuppetSound>) => worker.updateAudio(sounds),
    async start(state: PlayerRuntimeState, inputRevision = 0) {
      invalidate()
      const request = generation
      await worker.reset(state, request, inputRevision)
      if (!disposed && request === generation) {
        origin = Date.now() - (presentationDelay ?? 0)
        lastTime = origin
        clock = createBufferClock(origin)
        previousRefresh = undefined
        first = true
        active = true
        pump()
        schedule()
      }
    },
  }
}
export type BufferSession = ReturnType<typeof createBufferSession>
