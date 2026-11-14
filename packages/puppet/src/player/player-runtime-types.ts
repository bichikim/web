import type {createExpressionLayers} from './internal/create-expression-layers'
import type {RuntimeNoticesState} from './runtime-notice-types'
import type {AdditionalPlaybackState} from './playback/types'
import type {MotionSounds} from './audio/motion-sounds'
import type {PuppetParameterValueMap} from '../deformation'
import type {CreatePlayerOptions} from './player-types'
import type {RendererController} from './rendering/create-renderer-controller'
import type {createAppAdjustments} from './internal/app-adjustments'
import type {createLookAndBreath} from './internal/look-and-breath'
import type {createPhysicsState} from './internal/physics'
import type {PoseState} from './internal/pose'
import type {PuppetRenderOverride} from './internal/render-overrides'
import type {DEFAULT_EYE_BLINK_TIMING, EyeBlinkState} from './eye-blink'
import type {PuppetVowelWeights} from './document'
import type {ChainsState} from './physics-chain'
import type {
  createExpressionPlayback,
  createMotionParameterHistory,
  createSelectedPlayback,
} from './playback'
import type {MouthShapesState} from './voice/mouth-shapes'

export interface CreatePlayerRuntimeOptions extends Pick<
  CreatePlayerOptions,
  | 'document'
  | 'motionId'
  | 'parameterValues'
  | 'physicsPreview'
  | 'random'
  | 'randomSeed'
  | 'onFrame'
  | 'onMotionEvent'
  | 'onSoundError'
  | 'soundDestination'
> {
  /** Renderer owned by this runtime and disposed with its player. */
  readonly renderer: RendererController
  /** Reports a running-state change; omitted when the caller drives time explicitly. */
  readonly onRunning?: () => void
  /** Announces decoded audio resources; omitted, no host resource notification. */
  readonly onResources?: () => void
  /** Numerical audio adapter in a compute Worker; omitted, owns host audio loading/output. */
  readonly sounds?: MotionSounds
  /** Compute runtimes collect notices instead of invoking host callbacks; omitted, present locally. */
  readonly compute?: boolean
  /** Defers the initial numeric frame to its Worker; omitted, render the initial frame locally. */
  readonly deferred?: boolean
}

export interface PlayerRuntimeState {
  readonly additional: ReadonlyArray<AdditionalPlaybackState>
  readonly notices: RuntimeNoticesState
  readonly randomState: number
  readonly adjustments: ReturnType<ReturnType<typeof createAppAdjustments>['capture']>
  readonly chainState: ChainsState | undefined
  readonly expressionLayers: ReturnType<ReturnType<typeof createExpressionLayers>['capture']>
  readonly expressions: ReturnType<ReturnType<typeof createExpressionPlayback>['capture']>
  readonly eyeBlink: EyeBlinkState | undefined
  readonly eyeBlinkTiming: typeof DEFAULT_EYE_BLINK_TIMING
  readonly frameValues: PuppetParameterValueMap
  readonly history: ReturnType<ReturnType<typeof createMotionParameterHistory>['capture']>
  readonly lipSyncLevel: number | undefined
  readonly look: ReturnType<ReturnType<typeof createLookAndBreath>['capture']>
  readonly modelOpacity: number
  readonly mouth: MouthShapesState | undefined
  readonly parameterValues: PuppetParameterValueMap
  readonly physicsPreview: boolean
  readonly physicsState: ReturnType<typeof createPhysicsState>
  readonly playback: ReturnType<ReturnType<typeof createSelectedPlayback>['capture']>
  readonly poseState: PoseState
  readonly renderOverrides: {
    readonly groups: ReadonlyMap<string, PuppetRenderOverride>
    readonly parts: ReadonlyMap<string, PuppetRenderOverride>
  }
  readonly voiceTarget: PuppetVowelWeights | undefined
}
