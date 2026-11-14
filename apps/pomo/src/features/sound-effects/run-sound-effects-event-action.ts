import type {EventActionId} from '../focus-room-dialogue/schema'
import type {SoundEffectsController} from './context'

/** Applies automatic sound actions while preserving the user's stopped preference. */
export const runSoundEffectsEventAction = (
  controller: SoundEffectsController,
  actionId: EventActionId,
): boolean => {
  switch (actionId) {
    case 'sound-effects-start':
      if (!controller.isStopped()) {
        controller.activate()
      }
      return true
    case 'sound-effects-stop':
      controller.stop()
      return true
    case 'music-start':
    case 'music-stop':
      return false
    default: {
      const exhaustiveAction: never = actionId
      return exhaustiveAction
    }
  }
}
