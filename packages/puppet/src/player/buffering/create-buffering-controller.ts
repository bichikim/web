import {createBufferWorker} from './create-buffer-worker'
import type {PlayerRuntime} from '../create-player-runtime'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {RendererController} from '../rendering/create-renderer-controller'
import {applyRuntimeInputs} from './apply-runtime-inputs'
import {captureRuntimeInputs} from './capture-runtime-inputs'
import {type BufferSession, createBufferSession} from './create-buffer-session'
import {createBufferedPlayer} from './create-buffered-player'
import {createFrameQuery} from './create-frame-query'
import {createInputMailbox} from './create-input-mailbox'
import {diffRuntimeInputs} from './diff-runtime-inputs'
import {
  type BufferFrame,
  PLAYER_BUFFER_FRAMES,
  type PlayerBufferingChange,
  type PlayerBufferingConfiguration,
  type PlayerBufferingInfo,
  type PlayerBufferingStatus,
  type PlayerInputChange,
  type PlayerWorkerRuntime,
  type RuntimeInputs,
} from './types'

interface CreateBufferingControllerOptions {
  /** Owns validated controls and the most recently presented checkpoint. */
  readonly runtime: PlayerRuntime
  readonly workerRuntime?: PlayerWorkerRuntime
  /** Limits Rust geometry to rendered parts and dependencies. Omitted, evaluates all parts. */
  readonly renderGeometryOnly?: boolean
  /** GPU resources retained exclusively by the host. */
  readonly renderer: RendererController
  /** Reports requested and actual ownership; omitted, query status explicitly. */
  readonly onChange?: (info: PlayerBufferingInfo) => void
  /** Whether host inputs can be serialized; omitted, allow Worker computation. */
  readonly supported?: boolean
}
interface InputWaiter {
  readonly revision: number
  readonly resolve: (result: PlayerInputChange) => void
}
const TIMELINE_RESETS = new Set(['seek', 'stop', 'setMotion', 'playMotion', 'playGroup'])

/** Owns asynchronous numerical state, pending controls, and the displayed query boundary. */
// eslint-disable-next-line max-lines-per-function -- One owner coordinates cancellation, checkpoints, and GPU lifetime.
export const createBufferingController = (options: CreateBufferingControllerOptions) => {
  const mailbox = createInputMailbox()
  const query = createFrameQuery(options.renderer)
  let enabled = false
  let disposed = false
  let owned = false
  let hidden = globalThis.document?.visibilityState === 'hidden'
  let status: PlayerBufferingStatus = 'disabled'
  let epoch = 0
  let configurationRevision = 0
  let appliedRevision = 0
  let resourcesQueued = false
  let queued = false
  let presenting = false
  let source = options.runtime.document()
  let presentedState = options.runtime.capture()
  let beforeInputs: RuntimeInputs | undefined
  let session: BufferSession | undefined
  let initializing: {readonly epoch: number; readonly promise: Promise<void>} | undefined
  let waiters: InputWaiter[] = []
  const info = (): PlayerBufferingInfo => ({
    enabled,
    framesAhead:
      status === 'active' && options.renderer.nativePlayback === undefined
        ? PLAYER_BUFFER_FRAMES
        : 0,
    status,
    ...((status === 'active' || status === 'idle') && options.workerRuntime !== undefined
      ? {workerRuntime: options.workerRuntime}
      : {}),
  })
  const publish = (next: PlayerBufferingStatus) => {
    status = next
    options.onChange?.(info())
  }
  const nativeRunning = () =>
    options.renderer.setRunning(!disposed && !owned && options.runtime.running())
  const resolveAll = (result: PlayerInputChange) => {
    const previous = waiters
    waiters = []
    previous.forEach((waiter) => waiter.resolve(result))
  }
  const resolveApplied = () => {
    waiters = waiters.filter((waiter) => {
      if (waiter.revision <= appliedRevision) {
        waiter.resolve('applied')
        return false
      }
      return true
    })
  }
  const disposeSession = () => {
    const previous = session
    session = undefined
    previous?.destroy()
  }
  const enterWorker = () => {
    if (!owned) {
      presentedState = options.runtime.capture()
      query.update(
        options.runtime.document(),
        presentedState,
        options.runtime.player.getExpression(),
      )
      owned = true
    }
    options.runtime.setDeferred(true)
    options.renderer.setRunning(false)
  }
  const fallback = (next: PlayerBufferingStatus) => {
    epoch += 1
    options.renderer.cancelPresentation?.()
    disposeSession()
    const {settle} = mailbox.snapshot()
    const wasOwned = owned
    owned = false
    options.runtime.setDeferred(false)
    if (wasOwned) {
      options.runtime.render(settle)
    }
    mailbox.clear()
    appliedRevision = mailbox.revision()
    query.clearGeometry()
    resolveAll('applied')
    nativeRunning()
    publish(next)
  }
  const present = (frame: BufferFrame) => {
    if (disposed || !owned || frame.inputRevision < appliedRevision) {
      return
    }
    presenting = true
    const request = epoch
    let submitted = false
    const commit = () => {
      if (disposed || !owned || request !== epoch) {
        return false
      }
      mailbox.acknowledge(frame.inputRevision)
      appliedRevision = frame.inputRevision
      presentedState = frame.state
      options.runtime.restore(frame.state)
      query.update(source, frame.state, options.runtime.player.getExpression())
      options.runtime.syncAudio()
      options.runtime.restore(applyRuntimeInputs(presentedState, mailbox.snapshot().patch))
      return true
    }
    const notify = () => {
      submitted = true
      resolveApplied()
      options.runtime.notifyEffects(frame.state.notices)
      if (!disposed && request === epoch) {
        options.runtime.notifyFrame(frame.playback)
      }
    }
    const finish = () => {
      presenting = false
      if (submitted && !disposed && owned && request === epoch) {
        resolveApplied()
        const next = options.runtime.running() ? 'active' : 'idle'
        if (status !== next) {
          publish(next)
        }
      }
    }
    const submit = options.renderer.presentFrame
    if (submit !== undefined) {
      return submit(frame.computed)
        .then(
          (result) => {
            if (result === 'presented' && commit()) {
              notify()
            }
          },
          () => {
            if (!disposed && owned && request === epoch) {
              fallback('error')
            }
          },
        )
        .finally(finish)
    }
    try {
      options.renderer.applyPreparedFrame(frame.computed)
      if (commit()) {
        options.renderer.redraw()
        notify()
      }
    } finally {
      finish()
    }
  }

  const startSession = async (owner: BufferSession, request: number) => {
    if (disposed || request !== epoch || owner !== session) {
      return
    }
    try {
      publish('preparing')
    } finally {
      if (!disposed && request === epoch && owner === session) {
        try {
          await owner.start(presentedState, appliedRevision)
        } catch {
          if (!disposed && request === epoch && owner === session) {
            fallback('error')
          }
        }
      }
    }
  }
  const prepare = async (request: number) => {
    if (disposed || !enabled || hidden || request !== epoch) {
      return
    }
    if (
      options.supported === false ||
      typeof Worker === 'undefined' ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      fallback('unsupported')
      return
    }
    enterWorker()
    try {
      if (session === undefined) {
        const {nativePlayback} = options.renderer
        const owner = createBufferSession({
          acknowledged: options.runtime.acknowledgedNotices,
          audio: options.runtime.audio(),
          async connectGeometry() {
            const connection = await options.renderer.connectGeometry?.()
            connection?.closed.then(() => {
              if (owner === session && !disposed && enabled) {
                epoch += 1
                disposeSession()
                initialize()
              }
            })
            return connection
          },
          ...(nativePlayback === undefined
            ? {}
            : {
                createWorker: (onError: (cause: Error) => void) =>
                  createBufferWorker(onError, 'rust', undefined, nativePlayback),
                presentDuringPlayback: true,
              }),
          document: source,
          input: (base) => {
            const revision = base?.revision ?? appliedRevision
            if (!mailbox.pending(revision)) {
              return undefined
            }
            const input = mailbox.snapshot(revision)
            const checkpoint = base?.state ?? presentedState
            const adjustmentBase =
              input.patch.adjustments !== undefined && Object.keys(input.patch).length === 1
                ? checkpoint
                : undefined
            return {
              adjustmentBase,
              revision: input.revision,
              settle: input.settle,
              state: applyRuntimeInputs(checkpoint, input.patch),
            }
          },
          onError: () => {
            if (owner === session && !disposed && enabled) {
              fallback('error')
            }
          },
          onFrame: present,
          prepareFrame: (frame) => options.renderer.prepareFrame?.(frame.computed),
          releaseFrame: (frame) => options.renderer.releasePreparedFrame?.(frame.computed),
          renderGeometryOnly: options.renderGeometryOnly,
          running: () => options.runtime.running(),
          workerRuntime: options.workerRuntime,
        })
        session = owner
      }
      await session.ready
    } catch {
      if (!disposed && request === epoch) {
        fallback('error')
      }
      return
    }
    if (session !== undefined) {
      await startSession(session, request)
    }
  }
  const initialize = () => {
    if (initializing?.epoch === epoch) {
      return initializing.promise
    }
    const promise = prepare(epoch)
    initializing = {epoch, promise}
    return promise
  }
  const unsubscribe = options.renderer.subscribeChange?.(() => {
    if (session !== undefined && !disposed && enabled) {
      epoch += 1
      disposeSession()
      initialize()
    }
  })
  const schedule = () => {
    if (queued || disposed || !owned) {
      return
    }
    queued = true
    queueMicrotask(() => {
      queued = false
      if (disposed || !owned || hidden) {
        return
      }
      if (session === undefined) {
        initialize()
      } else {
        session.refresh()
      }
    })
  }
  const beforeChange = () => {
    beforeInputs = undefined
    if (owned && !disposed) {
      beforeInputs = captureRuntimeInputs(options.runtime.capture())
    }
  }
  const afterChange = (command: string, accepted: boolean) => {
    if (disposed || !owned) {
      return
    }
    if (beforeInputs !== undefined) {
      const changed = diffRuntimeInputs({
        additionalReset:
          command.startsWith('motion.') && command.endsWith('.seek')
            ? Number(command.split('.')[1])
            : undefined,
        after: captureRuntimeInputs(options.runtime.capture()),
        before: beforeInputs,
        playback: accepted && TIMELINE_RESETS.has(command) ? 'replace' : undefined,
      })
      const patch =
        accepted && command === 'resetMotionHistory'
          ? {...changed, history: options.runtime.capture().history}
          : changed
      const {settle} = options.runtime.takeEvaluation()
      const previousRevision = mailbox.revision()
      const revision = mailbox.add(patch, settle)
      beforeInputs = undefined
      if (command === 'patchParameterBlends' && revision === previousRevision) {
        return
      }
    }
    const document = options.runtime.document()
    if (document !== source) {
      epoch += 1
      options.renderer.cancelPresentation?.()
      disposeSession()
      source = document
      presentedState = options.runtime.capture()
      mailbox.clear()
      mailbox.add({}, false, true)
      resolveAll('superseded')
    }
    if (command === 'setViewCamera') {
      options.renderer.redraw()
    }
    schedule()
  }
  const visibilityChanged = () => {
    hidden = globalThis.document?.visibilityState === 'hidden'
    if (!owned || disposed) {
      return
    }
    epoch += 1
    options.renderer.cancelPresentation?.()
    session?.invalidate()
    initializing = undefined
    if (hidden) {
      publish('idle')
    } else {
      initialize()
    }
  }
  const destroy = () => {
    if (disposed) {
      return
    }
    disposed = true
    epoch += 1
    options.renderer.cancelPresentation?.()
    disposeSession()
    mailbox.clear()
    query.clearGeometry()
    resolveAll('destroyed')
    options.runtime.setDeferred(false)
    globalThis.document?.removeEventListener('visibilitychange', visibilityChanged)
    try {
      unsubscribe?.()
      options.runtime.player.destroy()
    } finally {
      publish('destroyed')
    }
  }
  globalThis.document?.addEventListener('visibilitychange', visibilityChanged)
  const player = createBufferedPlayer({
    afterChange,
    beforeChange,
    destroy,
    player: {
      ...options.runtime.player,
      getExpression: () => (owned ? query.getExpression() : options.runtime.player.getExpression()),
      getParameterValue: (id) =>
        owned ? query.getParameterValue(id) : options.runtime.player.getParameterValue(id),
      getParameterValues: () =>
        owned ? query.getParameterValues() : options.runtime.player.getParameterValues(),
      hitTest: (point) =>
        disposed ? undefined : owned ? query.hitTest(point) : options.runtime.player.hitTest(point),
      redraw: () => (owned ? options.renderer.redraw() : options.runtime.player.redraw()),
    },
  })
  return {
    advance(deltaTime: number) {
      if (!owned) {
        options.runtime.tick(deltaTime)
      }
    },
    async configure(configuration: PlayerBufferingConfiguration): Promise<PlayerBufferingChange> {
      if (disposed) {
        return 'destroyed'
      }
      configurationRevision += 1
      const revision = configurationRevision
      ;({enabled} = configuration)
      epoch += 1
      options.renderer.cancelPresentation?.()
      initializing = undefined
      session?.invalidate()
      if (!enabled) {
        fallback('disabled')
      } else if (
        options.supported === false ||
        typeof Worker === 'undefined' ||
        typeof requestAnimationFrame === 'undefined'
      ) {
        fallback('unsupported')
      } else {
        enterWorker()
        if (hidden) {
          publish('idle')
        } else {
          await initialize()
        }
      }
      if (disposed) {
        return 'destroyed'
      }
      return revision === configurationRevision ? 'applied' : 'superseded'
    },
    flush(): Promise<PlayerInputChange> {
      if (disposed) {
        return Promise.resolve('destroyed')
      }
      if (!owned || (appliedRevision >= mailbox.revision() && !mailbox.pending())) {
        return (
          options.renderer.flush?.().then(() => (disposed ? 'destroyed' : 'applied')) ??
          Promise.resolve('applied')
        )
      }
      const promise = new Promise<PlayerInputChange>((resolve) => {
        waiters.push({resolve, revision: mailbox.revision()})
      })
      schedule()
      return promise
    },
    info,
    player,
    resourcesChanged() {
      if (disposed || resourcesQueued || !owned) {
        return
      }
      resourcesQueued = true
      queueMicrotask(async () => {
        resourcesQueued = false
        const owner = session
        const request = epoch
        if (disposed || owner === undefined) {
          return
        }
        try {
          await owner.resources(options.runtime.audio())
          if (!disposed && owner === session && request === epoch) {
            mailbox.add({}, false, true)
            schedule()
          }
        } catch {
          if (!disposed && owner === session && request === epoch) {
            fallback('error')
          }
        }
      })
    },
    runningChanged() {
      if (disposed || presenting) {
        return
      }
      nativeRunning()
      // A buffered command decides whether to wake the Worker after diffing its controls.
      if (owned && beforeInputs === undefined) {
        schedule()
      }
    },
  }
}
export type BufferingController = ReturnType<typeof createBufferingController>
