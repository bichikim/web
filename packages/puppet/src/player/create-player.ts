import type {PuppetParameterValueMap} from '../deformation'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {findHitArea} from './internal/hit-area'
import {createMotionSounds} from './audio/motion-sounds'
import type {MotionSoundError} from './audio/motion-sound-loader'
import type {PuppetVowelWeights} from './document'
import {toVowelWeights} from './voice/analyze-vowels'
import {
  advanceMouthShapes,
  applyMouthShapes,
  type MouthShapesState,
  normalizeVowelWeights,
} from './voice/mouth-shapes'
import type {PuppetFraming} from './internal/layout-player-root'
import {createLookAndBreath} from './internal/look-and-breath'
import type {LookTarget} from './look'

export type {PuppetFraming} from './internal/layout-player-root'
import {createPhysicsState, evaluatePhysics} from './internal/physics'
import {evaluatePose, isPoseFading, type PoseState} from './internal/pose'
import {resolveParameterValue} from './parameter-value'
import type {ChainsState} from './physics-chain'
import {
  createExpressionPlayback,
  createMotionPlaybacks,
  createSelectedPlayback,
  mixMotionFrames,
  type MotionEvent,
  type MotionPlayback,
  type MotionPlaybackOptions,
} from './playback'
import {createPlayerRenderer} from './rendering'
import {
  advanceEyeBlink,
  applyLipSync,
  createEyeBlinkState,
  DEFAULT_EYE_BLINK_TIMING,
  type EyeBlinkState,
  pickGroupMotion,
  type RandomSource,
} from './model-effects'

export interface Player {
  /** Releases external overrides; omitted IDs release all overrides. */
  clearParameterValues(parameterIds?: ReadonlyArray<string>): void
  destroy(): void
  /** The expression fading in or held, if any. */
  getExpression(): string | undefined
  getParameterValue(parameterId: string): number | undefined
  /** Returns a snapshot of resolved parameter values used by the last rendered frame. */
  getParameterValues(): PuppetParameterValueMap
  /** Hit area ID under a point in canvas CSS pixels, using the last rendered meshes. */
  hitTest(point: {readonly x: number; readonly y: number}): string | undefined
  pause(): void
  play(options?: PlayerPlaybackOptions): void
  playMotion(motionId: string, options?: PlayerPlaybackOptions): boolean
  /** Plays a random motion of `group` (Cubism's random motion); returns its ID. */
  playGroup(group: string, options?: PlayerPlaybackOptions): string | undefined
  redraw(): void
  resize(): void
  /** Pins the specified parameters to their defaults; omitted IDs reset all parameters. */
  resetParameters(parameterIds?: ReadonlyArray<string>): void
  /** Removes inertia at the current input pose without changing timeline time. */
  resetPhysics(): void
  resume(): void
  seek(time: number): void
  /** Cross-fades to an expression; omitted IDs fade the current one out. Unknown IDs return false. */
  setExpression(expressionId?: string): boolean
  /** Breathes with the document's `breath` parameters, added after motions and before physics. */
  setBreath(enabled: boolean): void
  /**
   * Where the document's `look` parameters look, `-1..1` (x right, y up); the look point follows
   * with limited speed. Omitted returns it to the center.
   */
  setLookTarget(target?: LookTarget): void
  /** Blinks the eye-blink role parameters automatically while no selected motion plays. */
  setEyeBlink(enabled: boolean): void
  /** Adds a mouth level to the lip-sync role parameters after physics; omitted stops. */
  setLipSync(level?: number): void
  /** Scales every part's opacity (0..1); motions' model opacity tracks start from it. */
  setModelOpacity(opacity: number): void
  /**
   * Vowel weights, such as `analyzeVowels` results, that blend the document's mouth shapes
   * after physics. Shown weights follow with the shapes' smoothing; omitted fades them out.
   */
  setVowelWeights(weights?: Partial<PuppetVowelWeights>): void
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
  /** Called after a rendered frame for each motion event its playbacks passed, in order. */
  readonly onMotionEvent?: (event: MotionEvent) => void
  /** Called for each motion sound that cannot be fetched or decoded; it stays silent. */
  readonly onSoundError?: (error: MotionSoundError) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly physicsPreview?: boolean
  /** Random numbers for eye blinks and motion groups; `Math.random` when omitted. */
  readonly random?: RandomSource
  readonly resolution?: number
  readonly resizeTo?: HTMLElement
  /**
   * Where motion sounds play, such as an `AudioContext`'s destination (resumed after a user
   * gesture). Without it motion sounds only drive the mouth.
   */
  readonly soundDestination?: AudioNode
  /**
   * What the screen shows: the document's `layout` rectangle (the default, the whole viewport
   * when it has none) or always the whole viewport, as an editor does.
   */
  readonly framing?: PuppetFraming
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
  let chainState: ChainsState | undefined
  let physicsPreview = options.physicsPreview ?? true
  let poseState: PoseState = new Map()
  let destroyed = false
  const random = options.random ?? Math.random
  let eyeBlink: EyeBlinkState | undefined
  const lookAndBreath = createLookAndBreath()
  let lipSyncLevel: number | undefined
  let mouth: MouthShapesState | undefined
  // Weights from `setVowelWeights`; playing motion sounds take over the mouth while they last.
  let voiceTarget: PuppetVowelWeights | undefined
  const sounds = createMotionSounds({
    destination: options.soundDestination,
    onError: (error) => {
      if (!destroyed) {
        options.onSoundError?.(error)
      }
    },
  })
  sounds.load(document)
  let modelOpacity = 1
  const expressions = createExpressionPlayback(document.expressions ?? [])
  const onEvent = (event: MotionEvent) => {
    if (!destroyed) {
      options.onMotionEvent?.(event)
    }
  }
  const playback = createSelectedPlayback({
    motionId: options.motionId,
    motions: document.motions,
    onEvent,
  })
  const playbacks = createMotionPlaybacks({
    motions: document.motions,
    onChange: () => {
      if (!destroyed) {
        applyFrame()
        redraw()
        syncTicker()
      }
    },
    onEvent,
  })

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    playback.stop()
    playbacks.stop()
    sounds.stop()
    renderer.destroy()
  }

  /** Eye openness from the automatic blink, which rests while a selected motion plays. */
  const blink = (deltaTime: number) => {
    if (eyeBlink === undefined || playback.isPlaying()) {
      return undefined
    }
    const next = advanceEyeBlink(eyeBlink, deltaTime, {random, timing: DEFAULT_EYE_BLINK_TIMING})
    eyeBlink = next.state
    return next.openness
  }
  /** Mouth shapes after physics: the motion sounds' vowels, else `setVowelWeights`'s. */
  const advanceMouth = (deltaTime: number, soundWeights: PuppetVowelWeights | undefined) => {
    const target =
      soundWeights !== undefined && document.mouthShapes !== undefined
        ? normalizeVowelWeights(soundWeights)
        : voiceTarget
    mouth =
      mouth === undefined && target === undefined
        ? undefined
        : advanceMouthShapes(
            {shown: mouth?.shown ?? toVowelWeights([]), ...(target === undefined ? {} : {target})},
            deltaTime,
            document.mouthShapes?.smoothing,
          )
  }
  const applyFrame = (deltaTime = 0, settlePhysics = !physicsPreview) => {
    const frames = [...playback.frames(), ...playbacks.frames()]
    const soundMouth = sounds.mouth(frames)
    const mix = mixMotionFrames({
      document,
      expressions: expressions.layers(),
      eyeOpenness: blink(deltaTime),
      frames,
      modelOpacity,
      parameterValues,
    })
    const result = evaluatePhysics({
      chainState,
      deltaTime,
      document,
      parameterValues: lookAndBreath.apply(document, mix.parameterValues, deltaTime),
      physicsState,
      settle: settlePhysics,
    })
    ;({chainState, physicsState} = result)
    advanceMouth(deltaTime, soundMouth?.weights)
    const shaped =
      mouth === undefined
        ? result.parameterValues
        : applyMouthShapes(document, result.parameterValues, mouth.shown)
    // Without mouth shapes, a motion sound's loudness opens the mouth (Cubism's volume lip sync).
    const level =
      soundMouth !== undefined && document.mouthShapes === undefined
        ? soundMouth.level
        : lipSyncLevel
    const effected = level === undefined ? shaped : applyLipSync(document, shaped, level)
    const pose = evaluatePose({
      deltaTime,
      document,
      parameterValues: effected,
      poseState,
      // The first frame and document changes show the selected entries without fading.
      settle: poseState.size === 0,
    })
    ;({poseState} = pose)
    renderer.applyFrame(mix, effected, pose.opacityByPartId)
    sounds.sync(frames)
    frameValues = Object.fromEntries(
      (document.parameters ?? []).map((parameter) => [
        parameter.id,
        resolveParameterValue(parameter, effected[parameter.id]),
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
        expressions.isAnimating() ||
        eyeBlink !== undefined ||
        lookAndBreath.isAnimating(document) ||
        mouth !== undefined ||
        voiceTarget !== undefined ||
        isPoseFading(poseState) ||
        (physicsPreview &&
          (document.physics?.pendulums.length ?? 0) + (document.physics?.chains?.length ?? 0) > 0),
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
    expressions.advance(deltaTime)
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
    if (document.poseGroups !== nextDocument.poseGroups) {
      poseState = new Map()
    }
    document = nextDocument
    sounds.load(document)
    playbacks.update(document.motions)
    playback.update(document.motions)
    expressions.update(document.expressions ?? [])
    if (physicsChanged) {
      physicsState = createPhysicsState(document)
      chainState = undefined
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
    getExpression: () => expressions.current(),
    getParameterValue(parameterId) {
      return Object.hasOwn(frameValues, parameterId) ? frameValues[parameterId] : undefined
    },
    getParameterValues: () => ({...frameValues}),
    hitTest(point) {
      if (destroyed) {
        return undefined
      }
      return findHitArea({
        document,
        paintOrder: renderer.getPaintOrder(),
        point: renderer.toDocumentPoint(point),
        vertices: (partId) => renderer.getPartVertices(partId),
      })
    },
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
    playGroup(group, settings) {
      const motion = destroyed ? undefined : pickGroupMotion(document, group, random)
      return motion !== undefined && playMotion(motion.id, settings) ? motion.id : undefined
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
    setBreath(enabled) {
      if (!destroyed && lookAndBreath.setBreath(enabled)) {
        refresh()
        syncTicker()
      }
    },
    setExpression(expressionId) {
      if (destroyed || !expressions.set(expressionId)) {
        return false
      }
      refresh()
      syncTicker()
      return true
    },
    setEyeBlink(enabled) {
      if (destroyed || enabled === (eyeBlink !== undefined)) {
        return
      }
      eyeBlink = enabled ? createEyeBlinkState(DEFAULT_EYE_BLINK_TIMING, random) : undefined
      refresh()
      syncTicker()
    },
    setLookTarget(target) {
      if (!destroyed) {
        lookAndBreath.setLookTarget(target)
        syncTicker()
      }
    },
    setLipSync(level) {
      lipSyncLevel = level !== undefined && Number.isFinite(level) ? level : undefined
      refresh()
    },
    setModelOpacity(opacity) {
      modelOpacity = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1
      refresh()
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
    setVowelWeights(weights) {
      if (destroyed) {
        return
      }
      voiceTarget = weights === undefined ? undefined : normalizeVowelWeights(weights)
      syncTicker()
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
