import {createRuntimeEffects} from './create-runtime-effects'
import type {RuntimeNoticesState} from './runtime-notice-types'
import type {CreatePlayerRuntimeOptions, PlayerRuntimeState} from './player-runtime-types'
import {createMotionSounds} from './audio/motion-sounds'
import type {PlayerFrame} from './player-types'
import {
  createRuntimeFrame,
  createRuntimePlayer,
  createRuntimeState,
  type RuntimeState,
} from './runtime'

const notifyRuntimeEffects = (
  runtime: RuntimeState,
  effects: ReturnType<typeof createRuntimeEffects>,
  state: RuntimeNoticesState = runtime.notices.capture(),
) => {
  try {
    effects.dispatch(state)
  } finally {
    const acknowledged = effects.acknowledged()
    runtime.notices.acknowledge(acknowledged)
    const active = [
      runtime.playback.capture().completion,
      ...runtime.playbacks.capture().map((entry) => entry.completion),
    ]
    const waiting = state.pending.flatMap((notice) =>
      notice.sequence > acknowledged && notice.kind === 'completion' ? notice.completion : [],
    )
    effects.retain([...active.flatMap((token) => token ?? []), ...waiting])
  }
}

/** Releases a partially initialized runtime while preserving the initialization failure. */
const initializeFrame = (render: () => void, dispose: () => void) => {
  try {
    render()
  } catch (cause) {
    try {
      dispose()
    } catch (disposalCause) {
      throw new AggregateError(
        [cause, disposalCause],
        'Runtime initialization and disposal failed',
        {
          cause,
        },
      )
    }
    throw cause
  }
}

/** Owns frame advancement, host effects and resource lifetime around one shared numerical state. */
export const createPlayerRuntime = (options: CreatePlayerRuntimeOptions) => {
  const {renderer} = options
  const store = createRuntimeState({
    deferred: options.deferred,
    document: options.document,
    motionId: options.motionId,
    onChange: () => refresh(),
    parameterValues: options.parameterValues,
    physicsPreview: options.physicsPreview,
    random: options.random,
    randomSeed: options.randomSeed,
  })
  const {state, capture} = store
  const {expressions, notices, playback, playbacks} = state
  const effects = createRuntimeEffects({
    onEvent: (event) => {
      if (!state.destroyed) {
        options.onMotionEvent?.(event)
      }
    },
  })
  const sounds =
    options.sounds ??
    createMotionSounds({
      destination: options.soundDestination,
      onError: (error) => {
        if (!state.destroyed) {
          options.onSoundError?.(error)
        }
      },
      onLoad: () => {
        if (!state.destroyed) {
          if (state.deferred) {
            options.onResources?.()
          } else {
            refresh()
          }
        }
      },
    })
  sounds.load(state.document)
  const applyFrame = createRuntimeFrame({
    onFrame: (frame) => options.onFrame?.(frame),
    renderer,
    sounds,
    state,
  })

  const syncTicker = () => {
    if (state.destroyed) {
      return
    }
    state.running = store.isRunning()
    options.onRunning?.()
  }
  const redraw = () => {
    if (!state.destroyed && !state.deferred) {
      renderer.redraw()
    }
  }
  const tick = (deltaTime: number) => {
    if (state.destroyed) {
      return
    }
    const callbacks = playbacks.advance(deltaTime)
    const complete = playback.advance(deltaTime)
    expressions.advance(deltaTime)
    state.expressionLayers.advance(deltaTime)
    applyFrame(deltaTime)
    if (!state.destroyed) {
      complete?.()
    }
    for (const callback of callbacks) {
      if (!state.destroyed) {
        callback()
      }
    }
    if (options.compute !== true) {
      notifyRuntimeEffects(state, effects)
    }
    syncTicker()
  }
  const refresh = () => {
    if (!state.destroyed) {
      applyFrame()
      redraw()
      // A change without time passing can start a fade, such as a pose selection.
      syncTicker()
    }
  }
  const dispose = () => {
    if (state.destroyed) {
      return
    }
    state.destroyed = true
    playback.stop()
    playbacks.stop()
    sounds.stop()
    sounds.load({motions: []})
    effects.clear()
    notices.clear()
    renderer.destroy()
  }
  const restore = (checkpoint: PlayerRuntimeState) => {
    store.restore(checkpoint)
    syncTicker()
  }
  initializeFrame(() => {
    applyFrame()
    redraw()
  }, dispose)
  const player = createRuntimePlayer({
    applyFrame,
    dispose,
    effects,
    redraw,
    refresh,
    renderer,
    sounds,
    state,
    syncTicker,
  })
  return {
    acknowledgedNotices: effects.acknowledged,
    acknowledgeNotices: (sequence: number) => notices.acknowledge(sequence),
    audio: sounds.snapshot,
    capture,
    document: () => state.document,
    frame: (): PlayerFrame => playback.getFrame(),
    notifyEffects: (notices?: RuntimeNoticesState) => notifyRuntimeEffects(state, effects, notices),
    notifyFrame: (frame: PlayerFrame = playback.getFrame()) => options.onFrame?.(frame),
    player,
    render(settle = false) {
      const requested = settle || state.settleRequested
      state.settleRequested = false
      applyFrame(0, requested || !state.physicsPreview)
      redraw()
    },
    restore,
    running: () => state.running,
    setDeferred(value: boolean) {
      state.deferred = value
    },
    syncAudio: () => sounds.sync([...playback.frames(), ...playbacks.frames()]),
    takeEvaluation() {
      const settle = state.settleRequested
      state.settleRequested = false
      return {settle}
    },
    tick,
  }
}
export type PlayerRuntime = ReturnType<typeof createPlayerRuntime>
