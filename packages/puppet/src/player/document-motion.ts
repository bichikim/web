/** Motion data: keyframes, tracks, fades and events. */

/**
 * Curve from a keyframe to the next. `bezier` follows {@link PuppetKeyframe.bezier}; `stepped`
 * holds the value until the next keyframe, and `inverse-stepped` takes the next value right
 * after the keyframe (Cubism's segment types).
 */
export const PUPPET_EASINGS = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'bezier',
  'stepped',
  'inverse-stepped',
] as const

export type PuppetEasing = (typeof PUPPET_EASINGS)[number]
export type PuppetTrackAxis = 'x' | 'y'

export interface PuppetKeyframe {
  /**
   * Control points `[x1, y1, x2, y2]` of a `bezier` curve to the next keyframe: `x` is a
   * fraction of the segment's duration (0..1) and `y` a value. Omitted, the handles are flat
   * at one third of the segment from each end (a smooth S curve).
   */
  readonly bezier?: readonly [number, number, number, number]
  /** Applies from this keyframe to the next keyframe in the track. */
  readonly easing?: PuppetEasing
  readonly time: number
  readonly value: number
}

/** Seconds over which a track's or motion's weight eases in after starting and out before ending. */
export interface PuppetMotionFade {
  readonly fadeInTime?: number
  readonly fadeOutTime?: number
}

/** A marker reported when playback passes `time` (Cubism's user data events). */
export interface PuppetMotionEvent {
  readonly time: number
  readonly value: string
}

/** WAV media types a motion sound's data URL may declare. */
export const PUPPET_SOUND_MEDIA_TYPES = ['audio/wav', 'audio/wave', 'audio/x-wav'] as const

/**
 * Audio aligned with the motion's timeline from 0 seconds (Cubism's motion `Sound`): it loops,
 * seeks, pauses and changes speed with the motion, and drives the mouth while it lasts.
 * `src` is a linear PCM or float WAV file as a base64 data URL or a path relative to the
 * document.
 */
export interface PuppetMotionSound {
  readonly src: string
}

export interface PuppetVertexTrack extends PuppetMotionFade {
  readonly axis: PuppetTrackAxis
  readonly kind: 'vertex'
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly partId: string
  readonly vertexIndex: number
}

export interface PuppetParameterTrack extends PuppetMotionFade {
  readonly kind: 'parameter'
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly parameterId: string
}

export const PUPPET_MODEL_TRACK_TARGETS = ['opacity', 'eye-blink', 'lip-sync'] as const

/**
 * Cubism's model curves: `opacity` is the model opacity (0..1); `eye-blink` is eye openness
 * (0..1) for the eye-blink role parameters, scaling their own curves in the motion or setting
 * them; `lip-sync` is added to the lip-sync role parameters' curves or sets them.
 */
export type PuppetModelTrackTarget = (typeof PUPPET_MODEL_TRACK_TARGETS)[number]

export interface PuppetModelTrack extends PuppetMotionFade {
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly kind: 'model'
  readonly target: PuppetModelTrackTarget
}

/** A scene group's opacity (0..1) while the motion plays (Cubism's part opacity curve). */
export interface PuppetGroupOpacityTrack extends PuppetMotionFade {
  readonly groupId: string
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly kind: 'group-opacity'
}

export type PuppetTrack =
  | PuppetGroupOpacityTrack
  | PuppetModelTrack
  | PuppetParameterTrack
  | PuppetVertexTrack

/**
 * Fades default to 0 (no fade), unlike Cubism's 1 second, so motions without them play as
 * before. A track's own fade times replace the motion's for that track.
 */
export interface PuppetMotion extends PuppetMotionFade {
  readonly duration: number
  readonly events?: ReadonlyArray<PuppetMotionEvent>
  /** Frame rate for editing this motion's timeline; the document's when omitted. */
  readonly framesPerSecond?: number
  /** Motion group (Cubism's model3 motion groups); `playGroup` picks one of its motions. */
  readonly group?: string
  readonly id: string
  /** Whether playback loops when the caller does not say; defaults to `true`. */
  readonly loop?: boolean
  /** Display name; the ID is shown when omitted. */
  readonly name?: string
  readonly sound?: PuppetMotionSound
  readonly timelineParameterIds?: ReadonlyArray<string>
  readonly tracks: ReadonlyArray<PuppetTrack>
}
