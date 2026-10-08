import type {PuppetParameterValueMap} from '../deformation'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {createPhysicsState, evaluatePhysics} from './internal/physics'
import {resolveParameterValue} from './parameter-value'
import {
  createMotionPlaybacks,
  createSelectedPlayback,
  mixMotionFrames,
  type MotionPlayback,
  type MotionPlaybackOptions,
} from './playback'
import {createPlayerRenderer} from './rendering'

export interface Player {
  /** Releases external overrides; omitted IDs release all overrides. */
  clearParameterValues(parameterIds?: ReadonlyArray<string>): void
  destroy(): void
  getParameterValue(parameterId: string): number | undefined
  /** Returns a snapshot of resolved parameter values used by the last rendered frame. */
  getParameterValues(): PuppetParameterValueMap
  pause(): void
  play(options?: PlayerPlaybackOptions): void
  playMotion(motionId: string, options?: PlayerPlaybackOptions): boolean
  redraw(): void
  resize(): void
  /** Pins the specified parameters to their defaults; omitted IDs reset all parameters. */
  resetParameters(parameterIds?: ReadonlyArray<string>): void
  /** Removes inertia at the current input pose without changing timeline time. */
  resetPhysics(): void
  resume(): void
  seek(time: number): void
  setMotion(motionId: string): boolean
  /** Updates one external override without replacing other overrides. */
  setParameterValue(parameterId: string, value: number): boolean
  /** Replaces the external override map; unknown IDs are ignored. */
  setParameterValues(values: PuppetParameterValueMap): void
  setPlaybackSpeed(speed: number): void
  /** Enables inertia; when disabled, physics outputs follow their static input equilibrium. */
  setPhysicsPreview(enabled: boolean): void
  /** Starts an independent playback; missing motions return undefined. */
  startMotion(motionId: string, options?: MotionPlaybackOptions): MotionPlayback | undefined
  /** Removes all motion contributions and resets the selected motion's time. */
  stop(): void
  updateDocument(document: PreparedPuppetDocument): boolean
}

export interface PlayerPlaybackOptions {
  readonly loop?: boolean
  readonly onComplete?: () => void
  readonly speed?: number
}

export interface PlayerFrame {
  readonly duration: number
  readonly motionId: string | null
  readonly time: number
}

export interface CreatePlayerOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PreparedPuppetDocument
  readonly motionId?: string
  readonly onAfterRender?: () => void
  readonly onBeforeRender?: () => void
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly physicsPreview?: boolean
  readonly resolution?: number
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

// eslint-disable-next-line max-lines-per-function -- Public operations share one lifecycle boundary.
export const createPlayer = async (options: CreatePlayerOptions): Promise<Player> => {
  assertPreparedPuppetDocument(options.document)

  const renderer = await createPlayerRenderer(options)
  let {document} = options
  let parameterValues: PuppetParameterValueMap = {...options.parameterValues}
  let frameValues: PuppetParameterValueMap = {}
  let physicsState = createPhysicsState(document)
  let physicsPreview = options.physicsPreview ?? true
  let destroyed = false
  const playback = createSelectedPlayback({motionId: options.motionId, motions: document.motions})
  const playbacks = createMotionPlaybacks({
    motions: document.motions,
    onChange: () => {
      if (!destroyed) {
        applyFrame()
        redraw()
        syncTicker()
      }
    },
  })

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    playback.stop()
    playbacks.stop()
    renderer.destroy()
  }

  const applyFrame = (deltaTime = 0, settlePhysics = !physicsPreview) => {
    const mix = mixMotionFrames({
      document,
      frames: [...playback.frames(), ...playbacks.frames()],
      parameterValues,
    })
    const result = evaluatePhysics({
      deltaTime,
      document,
      parameterValues: mix.parameterValues,
      physicsState,
      settle: settlePhysics,
    })
    ;({physicsState} = result)
    renderer.applyFrame(mix, result.parameterValues)
    frameValues = Object.fromEntries(
      (document.parameters ?? []).map((parameter) => [
        parameter.id,
        resolveParameterValue(parameter, result.parameterValues[parameter.id]),
      ]),
    )
    // Frame listeners can redraw synchronously after the renderer has updated its masks.
    options.onFrame?.(playback.getFrame())
  }

  const syncTicker = () => {
    if (destroyed) {
      return
    }
    renderer.setRunning(
      playback.isPlaying() ||
        playbacks.isPlaying() ||
        (physicsPreview && (document.physics?.pendulums.length ?? 0) > 0),
    )
  }
  const redraw = () => {
    if (!destroyed) {
      renderer.redraw()
    }
  }

  renderer.subscribeFrame((deltaTime) => {
    if (destroyed) {
      return
    }
    const callbacks = playbacks.advance(deltaTime)
    const complete = playback.advance(deltaTime)
    applyFrame(deltaTime)
    if (!destroyed) {
      complete?.()
    }
    for (const callback of callbacks) {
      if (!destroyed) {
        callback()
      }
    }
    syncTicker()
  })

  applyFrame()
  redraw()

  const updateDocument = (nextDocument: PreparedPuppetDocument) => {
    if (destroyed) {
      return false
    }
    assertPreparedPuppetDocument(nextDocument)

    if (!renderer.updateDocument(nextDocument)) {
      return false
    }

    const physicsChanged = document.physics !== nextDocument.physics
    document = nextDocument
    playbacks.update(document.motions)
    playback.update(document.motions)
    if (physicsChanged) {
      physicsState = createPhysicsState(document)
      syncTicker()
    }

    applyFrame()
    redraw()
    syncTicker()

    return true
  }

  const setMotion = (motionId: string) => {
    if (destroyed) {
      return false
    }
    const selection = playback.select(motionId)
    switch (selection) {
      case 'changed':
        applyFrame()
        redraw()
        return true
      case 'unchanged':
        return true
      case 'missing':
        return false
      default: {
        const exhaustive: never = selection
        throw new Error(`Unknown motion selection: ${exhaustive}`)
      }
    }
  }
  const playMotion = (motionId: string, settings: PlayerPlaybackOptions = {}) => {
    if (destroyed || !playback.playMotion(motionId, settings)) {
      return false
    }
    applyFrame()
    redraw()
    syncTicker()
    return true
  }

  const refresh = () => {
    if (!destroyed) {
      applyFrame()
      redraw()
    }
  }
  const resume = () => {
    if (!destroyed) {
      playback.resume()
      playbacks.resume()
      syncTicker()
    }
  }
  return {
    clearParameterValues(parameterIds) {
      if (destroyed) {
        return
      }
      const ids = new Set(parameterIds ?? Object.keys(parameterValues))
      parameterValues = Object.fromEntries(
        Object.entries(parameterValues).filter(([id]) => !ids.has(id)),
      )
      refresh()
    },
    destroy,
    getParameterValue(parameterId) {
      return Object.hasOwn(frameValues, parameterId) ? frameValues[parameterId] : undefined
    },
    getParameterValues: () => ({...frameValues}),
    pause() {
      if (destroyed) {
        return
      }
      playback.pause()
      playbacks.pause()
      syncTicker()
    },
    play(playbackOptions) {
      if (destroyed) {
        return
      }
      if (playback.play(playbackOptions)) {
        refresh()
      }
      syncTicker()
    },
    playMotion,
    redraw,
    resetParameters(parameterIds) {
      if (destroyed) {
        return
      }
      const ids = parameterIds === undefined ? undefined : new Set(parameterIds)
      parameterValues = {
        ...parameterValues,
        ...Object.fromEntries(
          (document.parameters ?? [])
            .filter((parameter) => ids === undefined || ids.has(parameter.id))
            .map((parameter) => [parameter.id, parameter.defaultValue]),
        ),
      }
      refresh()
    },
    resetPhysics() {
      if (destroyed) {
        return
      }
      applyFrame(0, true)
      redraw()
    },
    resize() {
      if (destroyed) {
        return
      }
      renderer.resize()
    },
    resume,
    seek(time: number) {
      if (destroyed) {
        return
      }
      playback.seek(time)
      applyFrame()
      redraw()
    },
    setMotion,
    setParameterValue(parameterId, value) {
      const parameter = document.parameters?.find((candidate) => candidate.id === parameterId)
      if (destroyed || parameter === undefined) {
        return false
      }
      parameterValues = {...parameterValues, [parameterId]: resolveParameterValue(parameter, value)}
      refresh()
      return true
    },
    setParameterValues(values) {
      if (destroyed) {
        return
      }
      parameterValues = Object.fromEntries(
        (document.parameters ?? [])
          .filter((parameter) => Object.hasOwn(values, parameter.id))
          .map((parameter) => [
            parameter.id,
            resolveParameterValue(parameter, values[parameter.id]),
          ]),
      )
      refresh()
    },
    setPhysicsPreview(enabled) {
      if (destroyed || physicsPreview === enabled) {
        return
      }
      physicsPreview = enabled
      applyFrame(0, true)
      redraw()
      syncTicker()
    },
    setPlaybackSpeed(speed) {
      playback.setSpeed(speed)
      if (!destroyed) {
        syncTicker()
      }
    },
    startMotion: (motionId, settings) =>
      destroyed ? undefined : playbacks.start(motionId, settings),
    stop() {
      if (destroyed) {
        return
      }
      playback.stop()
      playbacks.stop()
      refresh()
      syncTicker()
    },
    updateDocument,
  }
}
