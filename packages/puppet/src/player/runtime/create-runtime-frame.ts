import {advanceEyeBlink} from '../eye-blink'
import {evaluatePhysics} from '../internal/physics'
import {evaluatePose} from '../internal/pose'
import {applyLipSync} from '../lip-sync'
import {resolveParameterValue} from '../parameter-value'
import {mixMotionFrames, type MotionFrame} from '../playback'
import {applyMouthShapes, followMouthShapes} from '../voice/mouth-shapes'
import type {RuntimeState} from './types'
import type {MotionSounds} from '../audio/motion-sounds'
import type {RendererController} from '../rendering/create-renderer-controller'
import type {PlayerFrame} from '../player-types'
interface CreateRuntimeFrameOptions {
  /** Numerical state borrowed from its owning runtime. */
  readonly state: RuntimeState
  /** Frame application adapter borrowed from its runtime. */
  readonly renderer: RendererController
  /** Numeric mouth analysis and host sound synchronization. */
  readonly sounds: MotionSounds
  /** Reports a completed numerical frame; omitted, no frame notification. */
  readonly onFrame?: (frame: PlayerFrame) => void
}

const advanceEffects = (
  options: CreateRuntimeFrameOptions,
  deltaTime: number,
  frames: ReadonlyArray<MotionFrame>,
) => {
  const {state, sounds} = options
  const {playback, lookAndBreath, random} = state
  const soundMouth = sounds.mouth(frames, deltaTime)
  // The automatic blink rests while a selected motion plays.
  const blinked =
    state.eyeBlink === undefined || playback.isPlaying()
      ? undefined
      : advanceEyeBlink(state.eyeBlink, deltaTime, {random, timing: state.eyeBlinkTiming})
  state.eyeBlink = blinked?.state ?? state.eyeBlink
  lookAndBreath.advance(deltaTime)
  state.mouth = followMouthShapes({
    deltaTime,
    document: state.document,
    soundWeights: soundMouth?.weights,
    state: state.mouth,
    voiceTarget: state.voiceTarget,
  })
  return {eyeOpenness: blinked?.openness, soundLevel: soundMouth?.level}
}
/** Evaluates the established effect/physics/pose sequence or records deferred work. */
export const createRuntimeFrame = (options: CreateRuntimeFrameOptions) => {
  const {state} = options
  const {playback, playbacks} = state
  const evaluateFrame = (
    frames: ReadonlyArray<MotionFrame>,
    effects: ReturnType<typeof advanceEffects>,
    deltaTime: number,
    settlePhysics: boolean,
  ) => {
    const {state, sounds, renderer} = options
    const {motionHistory, expressions, lookAndBreath, adjustments, playback} = state
    const mix = mixMotionFrames({
      baseParameterValues:
        state.document.motionParameterBase === 'previous-frame'
          ? motionHistory.base(frames)
          : undefined,
      document: state.document,
      expressionGroups: state.expressionLayers.layers(),
      expressions: expressions.layers(),
      eyeOpenness: effects.eyeOpenness,
      frames,
      modelOpacity: state.modelOpacity,
      parameterValues: state.parameterValues,
    })
    motionHistory.record(mix.motionParameterValues)
    const result = evaluatePhysics({
      chainState: state.chainState,
      deltaTime,
      document: state.document,
      parameterValues: lookAndBreath.apply(
        state.document,
        adjustments.applyBlends(state.document, mix.parameterValues),
      ),
      physicsOptions: adjustments.physicsOptions(),
      physicsState: state.physicsState,
      settle: settlePhysics,
    })
    ;({chainState: state.chainState, physicsState: state.physicsState} = result)
    const adjusted = adjustments.applyBlends(
      state.document,
      result.parameterValues,
      'after-physics',
    )
    const shaped =
      state.mouth === undefined
        ? adjusted
        : applyMouthShapes(state.document, adjusted, state.mouth.shown)
    // Without mouth shapes, a motion sound's loudness opens the mouth (Cubism's volume lip sync).
    const level =
      effects.soundLevel !== undefined && state.document.mouthShapes === undefined
        ? effects.soundLevel
        : state.lipSyncLevel
    const effected = level === undefined ? shaped : applyLipSync(state.document, shaped, level)
    const pose = evaluatePose({
      deltaTime,
      document: state.document,
      parameterValues: effected,
      poseState: state.poseState,
      // The first frame and document changes show the selected entries without fading.
      settle: state.poseState.size === 0,
    })
    ;({poseState: state.poseState} = pose)
    renderer.applyFrame(mix, effected, pose.opacityByPartId, state.renderOverrides)
    sounds.sync(frames)
    state.frameValues = Object.fromEntries(
      (state.document.parameters ?? []).map((parameter) => [
        parameter.id,
        resolveParameterValue(parameter, effected[parameter.id]),
      ]),
    )
    // Frame listeners can redraw synchronously after the renderer has updated its masks.
    options.onFrame?.(playback.getFrame())
  }

  const applyFrame = (deltaTime = 0, settlePhysics = !state.physicsPreview) => {
    if (state.deferred) {
      state.settleRequested ||= settlePhysics
      return
    }
    const frames = [...playback.frames(), ...playbacks.frames()]
    evaluateFrame(frames, advanceEffects(options, deltaTime, frames), deltaTime, settlePhysics)
  }
  return applyFrame
}
