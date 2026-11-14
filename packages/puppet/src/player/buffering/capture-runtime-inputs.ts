import {omit} from 'es-toolkit/object'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {RuntimeInputs} from './types'

/** Owns a control snapshot, including maps that commands can mutate before the next frame. */
export const captureRuntimeInputs = (state: PlayerRuntimeState): RuntimeInputs =>
  structuredClone(
    omit(state, ['chainState', 'frameValues', 'history', 'notices', 'physicsState', 'poseState']),
  )
