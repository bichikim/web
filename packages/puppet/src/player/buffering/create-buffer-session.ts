import {isEqual} from 'es-toolkit'
import type {GeometryConnection} from '../geometry/types'
import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import {createBufferClock} from './create-buffer-clock'
import {createBufferWorker} from './create-buffer-worker'
import {
  type BufferedInput,
  type BufferFrame,
  type BufferScheduler,
  type BufferWorker,
  PLAYER_BUFFER_FRAMES,
  type PlayerWorkerRuntime,
  type StaleBufferFrame,
} from './types'

interface CreateBufferSessionOptions {
  /** Acquires a rendering-device lease; omitted, the backend owns numerical evaluation independently. */
  readonly connectGeometry?: () => Promise<GeometryConnection | undefined>
  /** Begins drawing an already calculated input while an older frame waits for display. */
  readonly prepareFrame?: (frame: BufferFrame) => void
  /** Releases device resources, returning a promise while the renderer still borrows the coordinates. */
  readonly releaseFrame?: (frame: BufferFrame) => void | Promise<void>

  /**
   * Creates a new Worker with the supplied failure callback; omitted, creates a browser Worker.
   * The session owns and destroys the returned Worker.
   */
  readonly createWorker?: (onError: (cause: Error) => void) => BufferWorker
  /** The native worker submits current frames as part of their evaluation. */
  readonly presentDuringPlayback?: boolean
  /** Immutable prepared geometry; textures and GPU resources remain with the host. */
  readonly document: PuppetDocument
  readonly workerRuntime?: PlayerWorkerRuntime
  /** Limits Rust geometry to rendered parts and dependencies. Omitted, evaluates all parts. */
  readonly renderGeometryOnly?: boolean
  /** Decoded audio for numeric mouth analysis; omitted, no sounds are available. */
  readonly audio?: ReadonlyMap<string, PuppetSound>
  /** Last notification sequence delivered by the host; omitted, nothing has been delivered. */
  readonly acknowledged?: () => number
  /** Applies one frame before storage is recycled; asynchronous presentation is awaited. */
  readonly onFrame: (frame: BufferFrame) => void | Promise<void>
  /** Reports infrastructure failure; the owner chooses compatibility fallback. */
  readonly onError: () => void
  /** Controls rebased on the submitted checkpoint, excluding its applied revision. Omitted, predict only. */
  readonly input?: (base?: Pick<BufferedInput, 'state' | 'revision'>) => BufferedInput | undefined
  /** Whether simulation continues without input. Omitted, keep predicting. */
  readonly running?: () => boolean
  /** Borrowed scheduling callbacks; omitted, uses Date.now and browser frame/microtask APIs. */
  readonly scheduler?: BufferScheduler
}
const BUFFER_CAPACITY = 9

const canCoalesceInput = ({adjustmentBase, settle, state}: BufferedInput) => {
  if (adjustmentBase === undefined || settle) {
    return false
  }
  const previous = adjustmentBase.adjustments
  const current = state.adjustments
  return (
    isEqual(previous.physicsOptions, current.physicsOptions) &&
    isEqual(previous.blends.interaction, current.blends.interaction) &&
    isEqual(previous.blends['after-physics'], current.blends['after-physics'])
  )
}

const prepareDisplay = ({computed}: BufferFrame) => {
  if (computed.geometry === undefined) {
    const {plans: _plans, layers: _layers} = computed.frame
  }
}

/** Owns one ordered Worker stream, prioritizing current input over speculative frames. */
// eslint-disable-next-line max-lines-per-function, max-statements -- Scheduling, cancellation and frame ownership share one ordered stream.
export const createBufferSession = (options: CreateBufferSessionOptions) => {
  const worker =
    options.createWorker === undefined
      ? createBufferWorker(options.onError, options.workerRuntime, options.connectGeometry)
      : options.createWorker(options.onError)
  const scheduler: BufferScheduler = options.scheduler ?? {
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    now: () => Date.now(),
    queueMicrotask: (callback) => queueMicrotask(callback),
    requestFrame: (callback) => requestAnimationFrame(callback),
  }
  let disposed = false
  let generation = 0
  let active = false
  let first = false
  const presentDuringPlayback = options.presentDuringPlayback === true
  let refreshPending = false
  let presenting = false
  let submittedBase: Pick<BufferedInput, 'state' | 'revision'> | undefined
  let consumedRevision = 0
  const flights = new Set<{readonly generation: number}>()
  let queuedRevision = 0
  let animation: number | undefined
  let refreshCount = 0
  let lastInputRevision: number | undefined
  let lastInputRefresh: number | undefined
  let inputStream = false
  let previousRefresh: number | undefined
  let origin = scheduler.now()
  let lastTime = origin
  let clock = createBufferClock(origin)
  let presentationDelay: number | undefined
  let frames: BufferFrame[] = []
  let readyInput: BufferFrame | undefined
  let pool: ArrayBuffer[] = []
  const isRunning = () => options.running?.() ?? true
  const recentInput = () =>
    inputStream && lastInputRefresh !== undefined && refreshCount - lastInputRefresh < 2
  const observeInput = (input: BufferedInput) => {
    if (input.revision !== lastInputRevision) {
      inputStream = lastInputRefresh !== undefined && refreshCount - lastInputRefresh < 2
      lastInputRevision = input.revision
      lastInputRefresh = refreshCount
    }
  }
  const ready = worker.initialize(options.document, options.audio).then((bytes) => {
    if (!disposed) {
      pool = Array.from({length: BUFFER_CAPACITY}, () => new ArrayBuffer(bytes))
    }
  })
  const release = (frame: BufferFrame | StaleBufferFrame) => {
    const buffer = frame.kind === 'frame' ? frame.computed.vertices.buffer : frame.buffer
    const recycle = () => {
      if (!disposed && buffer instanceof ArrayBuffer) {
        pool.push(buffer)
      }
    }
    const completion = frame.kind === 'frame' ? options.releaseFrame?.(frame) : undefined
    if (completion === undefined) {
      recycle()
    } else {
      completion.then(recycle, recycle)
    }
  }
  const clearPredictions = () => {
    frames.forEach(release)
    frames = []
  }
  const replaceReadyInput = (frame?: BufferFrame) => {
    if (readyInput !== undefined) {
      release(readyInput)
    }
    readyInput = frame
  }
  const invalidate = () => {
    generation += 1
    queuedRevision = 0
    active = false
    refreshCount = 0
    lastInputRevision = undefined
    lastInputRefresh = undefined
    inputStream = false
    refreshPending = false
    if (animation !== undefined) {
      scheduler.cancelFrame(animation)
    }
    animation = undefined
    clearPredictions()
    replaceReadyInput()
  }
  const schedule = () => {
    if (
      active &&
      !disposed &&
      animation === undefined &&
      (frames.length > 0 || (isRunning() && (presentDuringPlayback || recentInput())))
    ) {
      animation = scheduler.requestFrame(tick)
    }
  }
  const canProduce = (mode: 'latest' | 'prediction') =>
    active &&
    !disposed &&
    flights.size < Math.min(PLAYER_BUFFER_FRAMES, worker.concurrency?.() ?? 1) &&
    (!presenting || (!presentDuringPlayback && mode === 'prediction'))
  const canStartCurrentFrame = (running: boolean) =>
    !presentDuringPlayback || !running || first || refreshPending
  const unconsumedInput = () => {
    const pending = options.input?.(submittedBase)
    return pending !== undefined && pending.revision > Math.max(consumedRevision, queuedRevision)
      ? pending
      : undefined
  }
  const accepts = (
    frame: BufferFrame | StaleBufferFrame,
    request: {readonly generation: number},
    immediate: boolean,
  ): frame is BufferFrame =>
    active &&
    request.generation === generation &&
    frame.generation === generation &&
    frame.kind === 'frame' &&
    (immediate || frame.inputRevision >= queuedRevision)
  const waitingForInput = (input: BufferedInput | undefined, running: boolean) =>
    input === undefined && !first && (!running || (!presentDuringPlayback && recentInput()))
  const shouldWaitForPreparedFrame = (input: BufferedInput | undefined) =>
    readyInput !== undefined && input !== undefined && canCoalesceInput(input)
  const nextFrameTime = (running: boolean, immediate: boolean, input?: BufferedInput) => {
    if (input !== undefined) {
      clock.rebase(lastTime)
    }
    return running
      ? (immediate ? clock.current : clock.next)(scheduler.now() - (presentationDelay ?? 0))
      : {deltaTime: 0, time: lastTime}
  }
  const pump = (mode: 'latest' | 'prediction' = 'latest') => {
    const running = isRunning()
    if (!canProduce(mode) || !canStartCurrentFrame(running)) {
      return
    }
    // Consumed controls stay pending publicly until display; they must not be replayed.
    const input = unconsumedInput()
    // Preserve the calculated successor. Its selection opens the next slot for
    // the latest continuous blends.
    if (shouldWaitForPreparedFrame(input)) {
      return
    }
    if (input !== undefined) {
      observeInput(input)
      clearPredictions()
    }
    // New controls invalidate predictions. After a stream, observe two refresh boundaries
    // without new controls before spending the Worker on speculative frames again.
    if (waitingForInput(input, running)) {
      schedule()
      return
    }
    if (frames.length >= PLAYER_BUFFER_FRAMES) {
      return
    }
    const buffer = pool.pop()
    if (buffer === undefined) {
      return
    }
    const immediate = presentDuringPlayback || input !== undefined || !running
    const prediction = nextFrameTime(running, immediate, input)
    // Keep the first frame's display timestamp, but evaluate its restored pose at zero delta.
    const deltaTime = first ? 0 : prediction.deltaTime
    const request = {generation}
    first = false
    refreshPending = false
    flights.add(request)
    if (input !== undefined) {
      queuedRevision = Math.max(queuedRevision, input.revision)
    }
    worker
      .produce({
        acknowledgedNotices: options.acknowledged?.(),
        buffer,
        ...prediction,
        deltaTime,
        generation,
        input,
        ...(options.renderGeometryOnly === true ? {renderGeometryOnly: true} : {}),
      })
      .then((frame) => {
        flights.delete(request)
        if (disposed) {
          return
        }
        if (accepts(frame, request, immediate)) {
          consumedRevision = Math.max(consumedRevision, frame.inputRevision)
          if (presenting && input !== undefined) {
            if (readyInput === undefined || frame.inputRevision >= readyInput.inputRevision) {
              replaceReadyInput(frame)
              options.prepareFrame?.(frame)
            } else {
              release(frame)
            }
            // A new request invalidates predictions, while the completed input remains usable.
            pump('prediction')
            schedule()
            return
          }
          const current = frame.time <= scheduler.now() - (presentationDelay ?? 0)
          if (
            !presenting &&
            (immediate || !isRunning() || (current && unconsumedInput() !== undefined))
          ) {
            clearPredictions()
            replaceReadyInput()
            presenting = true
            // Host callbacks run outside the Worker promise rejection boundary.
            scheduler.queueMicrotask(() => present(frame, request.generation))
            return
          }
          frames.push(frame)
          // A due reply can be shown as soon as it arrives if no other frame is being presented.
          if (!presenting && presentationDelay !== undefined && current) {
            scheduler.queueMicrotask(presentDue)
          }
        } else {
          release(frame)
        }
        continueBuffering()
        schedule()
        if (frame.kind === 'frame' && frames.includes(frame)) {
          // Prepare plans that need decoding alongside the next calculation.
          prepareDisplay(frame)
        }
      })
      .catch(() => {
        flights.delete(request)
        if (!disposed && request.generation === generation) {
          options.onError()
        }
      })
    if ((worker.concurrency?.() ?? 1) > 1) {
      scheduler.queueMicrotask(() => pump(mode))
    }
  }
  function continueBuffering() {
    if (!presentDuringPlayback) {
      pump(presenting ? 'prediction' : 'latest')
    }
  }
  function present(frame: BufferFrame, request: number) {
    const finish = () => {
      presenting = false
      release(frame)
      if (!disposed && active && request === generation) {
        if (readyInput === undefined) {
          pump()
        }
        presentDue()
        schedule()
      }
    }
    try {
      if (!disposed && active && request === generation) {
        lastTime = frame.time
        if (!presentDuringPlayback) {
          presentationDelay ??= Math.max(0, scheduler.now() - lastTime)
        }
        submittedBase = {revision: frame.inputRevision, state: frame.state}
        if (!presentDuringPlayback) {
          pump('prediction')
        }
        presenting = true
        const completion = options.onFrame(frame)
        if (completion !== undefined && completion instanceof Promise) {
          completion.then(finish, () => {
            finish()
            if (!disposed && active && request === generation) {
              options.onError()
            }
          })
          return
        }
      }
    } catch (cause) {
      finish()
      throw cause
    }
    finish()
  }
  const presentDue = () => {
    if (presenting) {
      return
    }
    if (readyInput !== undefined) {
      const frame = readyInput
      readyInput = undefined
      clearPredictions()
      presenting = true
      present(frame, generation)
      return
    }
    const [entry] = frames
    if (
      entry !== undefined &&
      presentationDelay !== undefined &&
      entry.time + presentationDelay <= scheduler.now()
    ) {
      frames.shift()
      present(entry, generation)
    }
  }
  function tick(timestamp?: number) {
    animation = undefined
    if (disposed || !active) {
      return
    }
    refreshCount += 1
    refreshPending = presentDuringPlayback
    const request = generation
    const now = scheduler.now()
    const refreshTime = timestamp ?? now
    if (previousRefresh !== undefined) {
      clock.observeRefresh(refreshTime - previousRefresh)
    }
    previousRefresh = refreshTime
    if (presenting) {
      schedule()
      return
    }
    if (presentationDelay === undefined && frames.length >= PLAYER_BUFFER_FRAMES) {
      presentationDelay = now - origin
    }
    presentDue()
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
      const input = unconsumedInput()
      if (input !== undefined) {
        observeInput(input)
        clearPredictions()
      }
      pump(presenting ? 'prediction' : 'latest')
      schedule()
    },
    resources: (sounds: ReadonlyMap<string, PuppetSound>) => worker.updateAudio(sounds),
    async start(state: PlayerRuntimeState, inputRevision = 0) {
      invalidate()
      const request = generation
      await worker.reset(state, request, inputRevision)
      if (!disposed && request === generation) {
        origin = scheduler.now() - (presentationDelay ?? 0)
        lastTime = origin
        clock = createBufferClock(origin)
        previousRefresh = undefined
        submittedBase = {revision: inputRevision, state}
        consumedRevision = inputRevision
        queuedRevision = inputRevision
        first = true
        active = true
        pump()
        schedule()
      }
    },
  }
}
export type BufferSession = ReturnType<typeof createBufferSession>
