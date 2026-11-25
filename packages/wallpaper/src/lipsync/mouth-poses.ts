import type {Viseme} from '@winter-love/supertonic/visemes'
import type {LipSyncShape} from '../settings/lipsync'

export interface MouthPose {
  readonly form: number
  readonly open: number
}

/** Preset coordinates for Ash's mouth opening and deformation parameters. */
export const VISEME_MOUTH_POSES: Readonly<Record<Viseme, MouthPose>> = {
  closed: {form: 0, open: 0},
  narrow: {form: 0, open: 0.25},
  open: {form: 0.2, open: 0.9},
  rest: {form: 0, open: 0},
  round: {form: -1, open: 0.65},
  wide: {form: 1, open: 0.55},
}
export const LIP_SYNC_MOUTH_POSES: ReadonlyMap<LipSyncShape, MouthPose> = new Map([
  ['a', {...VISEME_MOUTH_POSES.open, form: 0}],
  ['i', {...VISEME_MOUTH_POSES.wide, form: 0.9}],
  ['u', {form: -0.8, open: 0.25}],
  ['e', {form: 0.45, open: 0.65}],
  ['o', {...VISEME_MOUTH_POSES.round, form: -0.6}],
  ['closed', VISEME_MOUTH_POSES.closed],
])
export const MOUTH_REST_THRESHOLD = 0.14
