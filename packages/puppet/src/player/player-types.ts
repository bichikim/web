import type {PuppetParameterValueMap} from '../deformation'
import type {MotionSoundError} from './audio/motion-sound-loader'
import type {PuppetVowelWeights} from './document'
import type {PuppetFraming} from './internal/layout-player-root'
import type {PreparedPuppetDocument} from './internal/prepared-document'
import type {PuppetRenderOverride} from './internal/render-overrides'
import type {LookTarget} from './look'
import type {EyeBlinkTiming} from './eye-blink'
import type {RandomSource} from './random'
import type {PuppetParameterBlend} from './parameter-blends'
import type {PuppetPhysicsOptions} from './physics-options'
import type {MotionEvent, MotionPlayback, MotionPlaybackOptions} from './playback'
import type {PlayerViewCamera} from './view-camera'

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
  /**
   * Seconds between blinks on average (each gap is random up to twice it) and of each blink
   * phase (Cubism's blinking interval and settings); omitted values use the defaults and no
   * argument restores them. A value that is not positive and finite returns false and changes
   * nothing. The blink already scheduled keeps its time.
   */
  setEyeBlinkTiming(timing?: Partial<EyeBlinkTiming>): boolean
  /** Adds a mouth level to the lip-sync role parameters after physics; omitted stops. */
  setLipSync(level?: number): void
  /**
   * Scales every part's opacity, limited to 0..1; motions' model opacity tracks start from it.
   * Non-finite values change nothing.
   */
  setModelOpacity(opacity: number): void
  /**
   * Overrides a scene group's own opacity and its parts' colors (Cubism's part overrides); `undefined`
   * clears it. Unknown IDs return false.
   */
  setGroupOverride(groupId: string, override?: PuppetRenderOverride): boolean
  /** Overrides a part's opacity, colors and culling; `undefined` clears it. Unknown IDs return false. */
  setPartOverride(partId: string, override?: PuppetRenderOverride): boolean
  /** Shows this document point and zoom instead of fitting the document. */
  setViewCamera(camera: PlayerViewCamera): void
  /**
   * Vowel weights, such as `analyzeVowels` results, that blend the document's mouth shapes
   * after physics. Shown weights follow with the shapes' smoothing; omitted fades them out.
   */
  setVowelWeights(weights?: Partial<PuppetVowelWeights>): void
  setMotion(motionId: string): boolean
  /** Updates one external override without replacing other overrides. */
  setParameterValue(parameterId: string, value: number): boolean
  /**
   * Overwrites, adds to or multiplies a parameter's value after motions and expressions, by a
   * weight (Cubism's parameter operations), until cleared with no blend; look, breath and
   * physics follow. Unknown IDs, unknown modes and non-finite numbers return false.
   */
  setParameterBlend(parameterId: string, blend?: PuppetParameterBlend): boolean
  /** Replaces the external override map; unknown IDs are ignored. */
  setParameterValues(values: PuppetParameterValueMap): void
  setPlaybackSpeed(speed: number): void
  /**
   * Replaces the document's chain gravity and wind (Cubism's physics options); omitted values
   * keep the document's and no argument restores it. Non-finite vectors or zero gravity return
   * false and change nothing.
   */
  setPhysicsOptions(options?: PuppetPhysicsOptions): boolean
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
