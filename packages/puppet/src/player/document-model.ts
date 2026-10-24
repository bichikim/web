/** Model metadata: automatic-effect roles, display groups of parameters and default framing. */

/**
 * Parameters driven by automatic effects (Cubism's model3 `Groups`): eye blink sets eye-blink
 * parameters by eye openness (1 is the default, 0 the range end farther from it); lip sync adds
 * the mouth level to lip-sync parameters.
 */
export interface PuppetParameterRoles {
  readonly eyeBlink?: ReadonlyArray<string>
  readonly lipSync?: ReadonlyArray<string>
}

/** A folder of parameters for display (Cubism's cdi3 parameter groups); may nest. */
export interface PuppetParameterGroup {
  /** Parent group. */
  readonly groupId?: string
  readonly id: string
  readonly name: string
}

/**
 * The part of the document players show by default (Cubism's model3 `Layout`): this rectangle,
 * in document coordinates, is fitted into the screen instead of the whole viewport.
 */
export interface PuppetLayout {
  /**
   * Where the rectangle sits when the screen's aspect ratio differs, per axis from 0 (left or
   * top) to 1 (right or bottom); centered when omitted.
   */
  readonly align?: readonly [number, number]
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/**
 * Automatic breathing on one parameter (Cubism's Breath): each frame adds
 * `(offset + peak · sin(2π · t / period)) · weight` after motions and before physics, `t` being
 * seconds since breathing started.
 */
export interface PuppetBreathParameter {
  readonly offset: number
  readonly parameterId: string
  readonly peak: number
  /** Seconds per breath; positive. */
  readonly period: number
  readonly weight: number
}

/**
 * One parameter that follows the look point `(X, Y)` (`-1..1`, x right, y up; Cubism's Look):
 * each frame adds `x · X + y · Y + xy · X · Y` after motions and before breathing.
 */
export interface PuppetLookParameter {
  readonly parameterId: string
  readonly x: number
  readonly xy: number
  readonly y: number
}

export const PUPPET_VOWELS = ['a', 'i', 'u', 'e', 'o'] as const
export type PuppetVowel = (typeof PUPPET_VOWELS)[number]
export type PuppetVowelWeights = Readonly<Record<PuppetVowel, number>>

/**
 * Mouth shapes per vowel for lip sync from audio (Cubism's motionsync3 mappings). Vowel weights
 * from voice analysis blend each vowel's values into the listed parameters over their current
 * values: `value · (1 − Σ w) + Σ w · shape`.
 */
export interface PuppetMouthShapes {
  /** Parameters the shapes set. */
  readonly parameterIds: ReadonlyArray<string>
  /** Seconds for the shown weights to follow new analysis results; 0.06 when omitted. */
  readonly smoothing?: number
  /** One value per `parameterIds` entry for each vowel. */
  readonly vowels: Readonly<Record<PuppetVowel, ReadonlyArray<number>>>
}
