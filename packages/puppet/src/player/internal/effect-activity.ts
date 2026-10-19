import type {PuppetDocument} from '../document'

/** Automatic effects a player has switched on. */
export interface EffectActivity {
  readonly eyeBlinking: boolean
  /** Whether mouth shapes are shown or a vowel target is set. */
  readonly shapingMouth: boolean
}

/**
 * Whether the switched-on effects can move anything: effects the document has no parameters for
 * show nothing, so they do not keep the render loop running.
 */
export const isEffectActive = (document: PuppetDocument, activity: EffectActivity) =>
  (activity.eyeBlinking && (document.parameterRoles?.eyeBlink?.length ?? 0) > 0) ||
  (activity.shapingMouth && document.mouthShapes !== undefined)
