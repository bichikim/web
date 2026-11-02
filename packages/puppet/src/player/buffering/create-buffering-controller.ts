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
  type RuntimeInputs,
} from './types'

interface CreateBufferingControllerOptions {
  /** Owns validated controls and the most recently presented checkpoint. */
  readonly runtime: PlayerRuntime
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
    framesAhead: status === 'active' ? PLAYER_BUFFER_FRAMES : 0,
    status,
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
    try {
      mailbox.acknowledge(frame.inputRevision)
      appliedRevision = frame.inputRevision
      presentedState = frame.state
      options.runtime.restore(frame.state)
      options.renderer.applyPreparedFrame(frame.computed)
      query.update(source, frame.state, options.runtime.player.getExpression())
      options.runtime.syncAudio()
      options.runtime.restore(applyRuntimeInputs(presentedState, mailbox.snapshot().patch))
      options.renderer.redraw()
      submitted = true
      resolveApplied()
      options.runtime.notifyEffects(frame.state.notices)
      if (!disposed && request === epoch) {
        options.runtime.notifyFrame(frame.playback)
      }
    } finally {
      presenting = false
      if (submitted && !disposed && owned && request === epoch) {
        resolveApplied()
        const next = options.runtime.running() ? 'active' : 'idle'
        if (status !== next) {
          publish(next)
        }
      }
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
        const owner = createBufferSession({
          acknowledged: options.runtime.acknowledgedNotices,
          audio: options.runtime.audio(),
          document: source,
          input: () => {
            if (!mailbox.pending()) {
              return undefined
            }
            const input = mailbox.snapshot()
            return {
              revision: input.revision,
              settle: input.settle,
              state: applyRuntimeInputs(presentedState, input.patch),
            }
          },
          onError: () => {
            if (owner === session && !disposed && enabled) {
              fallback('error')
            }
          },
          onFrame: present,
          running: () => options.runtime.running(),
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
  const schedule = () => {
    if (queued || disposed || !enabled || status === 'error') {
      return
    }
    queued = true
    queueMicrotask(() => {
      queued = false
      if (disposed || !enabled || hidden || status === 'error') {
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
    if (
      options.supported !== false &&
      enabled &&
      !disposed &&
      status !== 'error' &&
      typeof Worker !== 'undefined'
    ) {
      enterWorker()
      beforeInputs = captureRuntimeInputs(options.runtime.capture())
    }
  }
  const afterChange = (command: string, accepted: boolean) => {
    if (options.supported === false || disposed || !enabled || status === 'error') {
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
      mailbox.add(patch, settle)
      beforeInputs = undefined
    }
    const document = options.runtime.document()
    if (document !== source) {
      epoch += 1
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
    if (!enabled || disposed) {
      return
    }
    epoch += 1
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
    disposeSession()
    mailbox.clear()
    query.clearGeometry()
    resolveAll('destroyed')
    options.runtime.setDeferred(false)
    globalThis.document?.removeEventListener('visibilitychange', visibilityChanged)
    try {
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
      enabled = configuration.enabled
      epoch += 1
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
        return Promise.resolve('applied')
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
      if (enabled && status !== 'error') {
        schedule()
      }
    },
  }
}
export type BufferingController = ReturnType<typeof createBufferingController>
