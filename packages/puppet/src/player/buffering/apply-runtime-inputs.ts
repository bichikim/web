import type {AdditionalPlaybackState} from '../playback/types'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {RuntimeInputPatch} from './types'

/** Overlays desired controls while keeping the latest integrated physics, look and timeline fields. */
export const applyRuntimeInputs = (
  state: PlayerRuntimeState,
  patch: RuntimeInputPatch,
): PlayerRuntimeState => {
  const additional = new Map(state.additional.map((entry) => [String(entry.id), entry]))
  for (const [id, value] of Object.entries(patch.additional ?? {})) {
    if (value === null) {
      additional.delete(id)
    } else {
      const previous = additional.get(id)
      // An edit may arrive after the Worker has already faded this playback out.
      if (previous !== undefined || (value.id !== undefined && value.motionId !== undefined)) {
        additional.set(id, {...previous, ...value} as AdditionalPlaybackState)
      }
    }
  }
  return {
    ...state,
    ...patch,
    additional: [...additional.values()],
    look: {...state.look, ...patch.look},
    playback: {...state.playback, ...patch.playback},
  }
}
