import type {createExpressionLayers} from '../internal/create-expression-layers'
import type {MotionSounds} from '../audio/motion-sounds'
import type {createRuntimeEffects} from '../create-runtime-effects'
import type {RendererController} from '../rendering/create-renderer-controller'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {PreparedPuppetDocument} from '../internal/prepared-document'
import type {AppAdjustments} from '../internal/app-adjustments'
import type {LookAndBreath} from '../internal/look-and-breath'
import type {PuppetRenderOverride} from '../internal/render-overrides'
import type {ExpressionPlayback} from '../playback/expression-playback'
import type {MotionPlaybacks} from '../playback/create-motion-playbacks'
import type {SelectedPlayback} from '../playback/create-selected-playback'
import type {createMotionParameterHistory} from '../playback/create-motion-parameter-history'
import type {createRuntimeNotices} from '../create-runtime-notices'
import type {SeededRandom} from '../random'

type RuntimeFields = {
  -readonly [Key in keyof Omit<
    PlayerRuntimeState,
    | 'additional'
    | 'adjustments'
    | 'expressions'
    | 'expressionLayers'
    | 'history'
    | 'look'
    | 'notices'
    | 'playback'
    | 'randomState'
    | 'renderOverrides'
  >]: PlayerRuntimeState[Key]
}

/** Mutable data and numerical controllers owned by one runtime, shared with its command adapter. */
export interface RuntimeState extends RuntimeFields {
  document: PreparedPuppetDocument
  destroyed: boolean
  deferred: boolean
  running: boolean
  settleRequested: boolean
  renderOverrides: {
    readonly groups: Map<string, PuppetRenderOverride>
    readonly parts: Map<string, PuppetRenderOverride>
  }
  readonly adjustments: AppAdjustments
  readonly expressionLayers: ReturnType<typeof createExpressionLayers>
  readonly expressions: ExpressionPlayback
  readonly lookAndBreath: LookAndBreath
  readonly motionHistory: ReturnType<typeof createMotionParameterHistory>
  readonly notices: ReturnType<typeof createRuntimeNotices>
  readonly playback: SelectedPlayback
  readonly playbacks: MotionPlaybacks
  readonly random: SeededRandom
}

/** Serializes numerical state without transferring resource or lifecycle ownership. */
export interface RuntimeStore {
  readonly state: RuntimeState
  capture(): PlayerRuntimeState
  restore(checkpoint: PlayerRuntimeState): void
  isRunning(): boolean
}

export interface CreateRuntimePlayerOptions {
  /** Numerical state borrowed from the owning runtime. */
  readonly state: RuntimeState
  /** Rendering operations owned and disposed by the runtime. */
  readonly renderer: RendererController
  /** Motion sound loading/synchronization adapter borrowed from the runtime. */
  readonly sounds: MotionSounds
  /** Host completion callbacks retained outside serializable state. */
  readonly effects: ReturnType<typeof createRuntimeEffects>
  /** Evaluates a changed pose or records a deferred Worker evaluation request. */
  readonly applyFrame: (deltaTime?: number, settlePhysics?: boolean) => void
  /** Refreshes a control change and updates the runtime's running state. */
  readonly refresh: () => void
  /** Submits current geometry when the runtime is not deferred. */
  readonly redraw: () => void
  /** Updates running state after timing-only controls. */
  readonly syncTicker: () => void
  /** Releases this runtime's resources once and makes subsequent commands inert. */
  readonly dispose: () => void
}
