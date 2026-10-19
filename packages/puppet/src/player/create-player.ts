import type {PuppetParameterValueMap} from '../deformation'
import {createMotionSounds} from './audio/motion-sounds'
import type {PuppetVowelWeights} from './document'
import {
  advanceEyeBlink,
  createEyeBlinkState,
  DEFAULT_EYE_BLINK_TIMING,
  type EyeBlinkState,
  resolveEyeBlinkTiming,
} from './eye-blink'
import {createAppAdjustments} from './internal/app-adjustments'
import {isEffectActive} from './internal/effect-activity'
import {findHitArea} from './internal/hit-area'
import {createLookAndBreath} from './internal/look-and-breath'
import {createPhysicsState, evaluatePhysics} from './internal/physics'
import {evaluatePose, isPoseFading, type PoseState} from './internal/pose'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {type PuppetRenderOverride, setRenderOverride} from './internal/render-overrides'
import {getSceneGroupIds} from './internal/scene-groups'
import {applyLipSync} from './lip-sync'
import {pickGroupMotion} from './motion-groups'
import {resolveParameterValue} from './parameter-value'
import type {ChainsState} from './physics-chain'
import {
  createExpressionPlayback,
  createMotionPlaybacks,
  createSelectedPlayback,
  mixMotionFrames,
  type MotionEvent,
  type MotionFrame,
} from './playback'
import type {CreatePlayerOptions, Player, PlayerPlaybackOptions} from './player-types'
import {createPlayerRenderer} from './rendering'
import {
  applyMouthShapes,
  followMouthShapes,
  type MouthShapesState,
  normalizeVowelWeights,
} from './voice/mouth-shapes'

export type {PuppetFraming} from './internal/layout-player-root'
export type {PuppetRenderOverride} from './internal/render-overrides'
export type {PuppetParameterBlend, PuppetParameterBlendMode} from './parameter-blends'
export type {PuppetPhysicsOptions} from './physics-options'
export type {CreatePlayerOptions, Player, PlayerFrame, PlayerPlaybackOptions} from './player-types'

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
  const adjustments = createAppAdjustments()
  let poseState: PoseState = new Map()
  let destroyed = false
  const random = options.random ?? Math.random
  let eyeBlink: EyeBlinkState | undefined
  let eyeBlinkTiming = DEFAULT_EYE_BLINK_TIMING
  const lookAndBreath = createLookAndBreath()
  const renderOverrides = {
    groups: new Map<string, PuppetRenderOverride>(),
    parts: new Map<string, PuppetRenderOverride>(),
  }
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
      refresh()
    },
    onEvent,
  })

  /**
   * Advances the effects whose state follows time alone (blink, look and breath, mouth shapes),
   * before this frame's values exist.
   */
  const advanceEffects = (deltaTime: number, frames: ReadonlyArray<MotionFrame>) => {
    const soundMouth = sounds.mouth(frames)
    // The automatic blink rests while a selected motion plays.
    const blinked =
      eyeBlink === undefined || playback.isPlaying()
        ? undefined
        : advanceEyeBlink(eyeBlink, deltaTime, {random, timing: eyeBlinkTiming})
    eyeBlink = blinked?.state ?? eyeBlink
    lookAndBreath.advance(deltaTime)
    mouth = followMouthShapes({
      deltaTime,
      document,
      soundWeights: soundMouth?.weights,
      state: mouth,
      voiceTarget,
    })
    return {eyeOpenness: blinked?.openness, soundLevel: soundMouth?.level}
  }
  /**
   * Evaluates the frame's values and renders them. Physics and pose fades also step here because
   * they integrate this frame's values over `deltaTime`.
   */
  const evaluateFrame = (
    frames: ReadonlyArray<MotionFrame>,
    effects: ReturnType<typeof advanceEffects>,
    deltaTime: number,
    settlePhysics: boolean,
  ) => {
    const mix = mixMotionFrames({
      document,
      expressions: expressions.layers(),
      eyeOpenness: effects.eyeOpenness,
      frames,
      modelOpacity,
      parameterValues,
    })
    const result = evaluatePhysics({
      chainState,
      deltaTime,
      document,
      parameterValues: lookAndBreath.apply(
        document,
        adjustments.applyBlends(document, mix.parameterValues),
      ),
      physicsOptions: adjustments.physicsOptions(),
      physicsState,
      settle: settlePhysics,
    })
    ;({chainState, physicsState} = result)
    const shaped =
      mouth === undefined
        ? result.parameterValues
        : applyMouthShapes(document, result.parameterValues, mouth.shown)
    // Without mouth shapes, a motion sound's loudness opens the mouth (Cubism's volume lip sync).
    const level =
      effects.soundLevel !== undefined && document.mouthShapes === undefined
        ? effects.soundLevel
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
    renderer.applyFrame(mix, effected, pose.opacityByPartId, renderOverrides)
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
  const applyFrame = (deltaTime = 0, settlePhysics = !physicsPreview) => {
    const frames = [...playback.frames(), ...playbacks.frames()]
    evaluateFrame(frames, advanceEffects(deltaTime, frames), deltaTime, settlePhysics)
  }

  const syncTicker = () => {
    if (destroyed) {
      return
    }
    renderer.setRunning(
      playback.isPlaying() ||
        playbacks.isPlaying() ||
        expressions.isAnimating() ||
        isEffectActive(document, {
          eyeBlinking: eyeBlink !== undefined,
          shapingMouth: mouth !== undefined || voiceTarget !== undefined,
        }) ||
        lookAndBreath.isAnimating(document) ||
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

    refresh()
    return true
  }

  const setMotion = (motionId: string) => {
    if (destroyed) {
      return false
    }
    const selection = playback.select(motionId)
    switch (selection) {
      case 'changed':
        // A pose the new motion selects starts fading.
        refresh()
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
    refresh()
    return true
  }

  const refresh = () => {
    if (!destroyed) {
      applyFrame()
      redraw()
      // A change without time passing can start a fade, such as a pose selection.
      syncTicker()
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
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      playback.stop()
      playbacks.stop()
      sounds.stop()
      renderer.destroy()
    },
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
      // The frame stops sounding motions too, even when the ticker stops after this.
      refresh()
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
      refresh()
    },
    setBreath(enabled) {
      if (!destroyed && lookAndBreath.setBreath(enabled)) {
        refresh()
      }
    },
    setExpression(expressionId) {
      if (destroyed || !expressions.set(expressionId)) {
        return false
      }
      refresh()
      return true
    },
    setEyeBlink(enabled) {
      if (destroyed || enabled === (eyeBlink !== undefined)) {
        return
      }
      eyeBlink = enabled ? createEyeBlinkState(eyeBlinkTiming, random) : undefined
      refresh()
    },
    setEyeBlinkTiming(timing) {
      const resolved = resolveEyeBlinkTiming(timing)
      if (destroyed || resolved === undefined) {
        return false
      }
      eyeBlinkTiming = resolved
      return true
    },
    setGroupOverride(groupId, override) {
      if (destroyed || !getSceneGroupIds(document.scene).has(groupId)) {
        return false
      }
      setRenderOverride(renderOverrides.groups, groupId, override)
      refresh()
      return true
    },
    setLipSync(level) {
      lipSyncLevel = level !== undefined && Number.isFinite(level) ? level : undefined
      refresh()
    },
    setLookTarget(target) {
      if (!destroyed) {
        lookAndBreath.setLookTarget(target)
        syncTicker()
      }
    },
    setModelOpacity(opacity) {
      // Like the other setters, non-finite input changes nothing.
      if (Number.isFinite(opacity)) {
        modelOpacity = Math.min(1, Math.max(0, opacity))
        refresh()
      }
    },
    setMotion,

    setParameterBlend(parameterId, blend) {
      if (destroyed || !adjustments.setParameterBlend(document, parameterId, blend)) {
        return false
      }
      refresh()
      return true
    },
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
    setPartOverride(partId, override) {
      if (destroyed || !document.parts.some((part) => part.id === partId)) {
        return false
      }
      setRenderOverride(renderOverrides.parts, partId, override)
      refresh()
      return true
    },
    setPhysicsOptions(options) {
      if (destroyed || !adjustments.setPhysicsOptions(options)) {
        return false
      }
      refresh()
      return true
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
      refresh()
    },
    setViewCamera(camera) {
      if (
        destroyed ||
        ![camera.x, camera.y, camera.zoom].every(Number.isFinite) ||
        camera.zoom <= 0
      ) {
        return
      }
      renderer.setViewCamera(camera)
      applyFrame()
      redraw()
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
    },
    updateDocument,
  }
}
