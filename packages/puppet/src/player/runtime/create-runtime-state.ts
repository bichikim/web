import {createExpressionLayers} from '../internal/create-expression-layers'
import {createAppAdjustments} from '../internal/app-adjustments'
import {createLookAndBreath} from '../internal/look-and-breath'
import {createPhysicsState} from '../internal/physics'
import {assertPreparedPuppetDocument} from '../internal/prepared-document'
import {DEFAULT_EYE_BLINK_TIMING} from '../eye-blink'
import {createRuntimeNotices} from '../create-runtime-notices'
import {createSeededRandom} from '../random'
import {
  createExpressionPlayback,
  createMotionParameterHistory,
  createMotionPlaybacks,
  createSelectedPlayback,
  type MotionEvent,
} from '../playback'
import type {CreatePlayerOptions} from '../player-types'
import type {RuntimeState, RuntimeStore} from './types'
import {isEffectActive} from '../internal/effect-activity'
import {isPoseFading} from '../internal/pose'

const isRunning = (state: RuntimeState) =>
  state.playback.isPlaying() ||
  state.playbacks.isPlaying() ||
  state.expressions.isAnimating() ||
  state.expressionLayers.isAnimating() ||
  isEffectActive(state.document, {
    eyeBlinking: state.eyeBlink !== undefined,
    shapingMouth: state.mouth !== undefined || state.voiceTarget !== undefined,
  }) ||
  state.lookAndBreath.isAnimating(state.document) ||
  isPoseFading(state.poseState) ||
  (state.physicsPreview &&
    (state.document.physics?.pendulums.length ?? 0) +
      (state.document.physics?.chains?.length ?? 0) >
      0)

interface CreateRuntimeStateOptions extends Pick<
  CreatePlayerOptions,
  'document' | 'motionId' | 'parameterValues' | 'physicsPreview' | 'random' | 'randomSeed'
> {
  /** Records evaluation requests instead of computing locally; omitted, compute locally. */
  readonly deferred?: boolean
  /** Refreshes the runtime after an independent playback control changes. */
  readonly onChange: () => void
}

/** Owns numerical state and checkpoints independently of renderers, audio output and host callbacks. */
export const createRuntimeState = (options: CreateRuntimeStateOptions): RuntimeStore => {
  assertPreparedPuppetDocument(options.document)
  const RANDOM_SEED_RANGE = 2_147_483_646
  const seeded = createSeededRandom(
    options.randomSeed ?? Math.floor(Math.random() * RANDOM_SEED_RANGE) + 1,
  )
  const source = options.random ?? seeded
  const random = Object.assign(() => source(), {capture: seeded.capture, restore: seeded.restore})
  const notices = createRuntimeNotices()
  const onEvent = (event: MotionEvent) => {
    if (!state.destroyed) {
      notices.emit({event, kind: 'event'})
    }
  }
  const onCompletion = (completion: number) => notices.emit({completion, kind: 'completion'})
  const state: RuntimeState = {
    adjustments: createAppAdjustments(),
    chainState: undefined,
    deferred: options.deferred ?? false,
    destroyed: false,
    document: options.document,
    expressionLayers: createExpressionLayers(options.document.expressions ?? [], options.onChange),
    expressions: createExpressionPlayback(options.document.expressions ?? []),
    eyeBlink: undefined,
    eyeBlinkTiming: DEFAULT_EYE_BLINK_TIMING,
    frameValues: {},
    lipSyncLevel: undefined,
    lookAndBreath: createLookAndBreath(),
    modelOpacity: 1,
    motionHistory: createMotionParameterHistory(),
    mouth: undefined,
    notices,
    parameterValues: {...options.parameterValues},
    physicsPreview: options.physicsPreview ?? true,
    physicsState: createPhysicsState(options.document),
    playback: createSelectedPlayback({
      fadeIn: options.document.motionParameterBase === 'previous-frame',
      motionId: options.motionId,
      motions: options.document.motions,
      onCompletion,
      onEvent,
    }),
    playbacks: createMotionPlaybacks({
      motions: options.document.motions,
      onChange: options.onChange,
      onCompletion,
      onEvent,
    }),
    poseState: new Map(),
    random,
    renderOverrides: {groups: new Map(), parts: new Map()},
    running: true,
    settleRequested: false,
    voiceTarget: undefined,
  }
  return {
    capture: () => ({
      additional: state.playbacks.capture(),
      adjustments: state.adjustments.capture(),
      chainState: state.chainState,
      expressionLayers: state.expressionLayers.capture(),
      expressions: state.expressions.capture(),
      eyeBlink: state.eyeBlink,
      eyeBlinkTiming: state.eyeBlinkTiming,
      frameValues: state.frameValues,
      history: state.motionHistory.capture(),
      lipSyncLevel: state.lipSyncLevel,
      look: state.lookAndBreath.capture(),
      modelOpacity: state.modelOpacity,
      mouth: state.mouth,
      notices: notices.capture(),
      parameterValues: state.parameterValues,
      physicsPreview: state.physicsPreview,
      physicsState: state.physicsState,
      playback: state.playback.capture(),
      poseState: state.poseState,
      randomState: random.capture(),
      renderOverrides: state.renderOverrides,
      voiceTarget: state.voiceTarget,
    }),
    isRunning: () => isRunning(state),
    restore(checkpoint) {
      ;({
        chainState: state.chainState,
        eyeBlink: state.eyeBlink,
        eyeBlinkTiming: state.eyeBlinkTiming,
        frameValues: state.frameValues,
        lipSyncLevel: state.lipSyncLevel,
        modelOpacity: state.modelOpacity,
        mouth: state.mouth,
        parameterValues: state.parameterValues,
        physicsPreview: state.physicsPreview,
        physicsState: state.physicsState,
        poseState: state.poseState,
        voiceTarget: state.voiceTarget,
      } = checkpoint)
      random.restore(checkpoint.randomState)
      notices.restore(checkpoint.notices)
      state.playbacks.restore(checkpoint.additional)
      state.adjustments.restore(checkpoint.adjustments)
      state.expressions.restore(checkpoint.expressions)
      state.expressionLayers.restore(checkpoint.expressionLayers)
      state.motionHistory.restore(checkpoint.history, state.document.motions)
      state.lookAndBreath.restore(checkpoint.look)
      state.playback.restore(checkpoint.playback)
      state.renderOverrides = {
        groups: new Map(checkpoint.renderOverrides.groups),
        parts: new Map(checkpoint.renderOverrides.parts),
      }
    },
    state,
  }
}
