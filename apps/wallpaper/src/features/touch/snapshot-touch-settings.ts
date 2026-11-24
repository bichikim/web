import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'

/** Captures each selected binding so in-place settings updates start a new touch session. */
export const snapshotTouchSettings = (settings: PoffoTouch | undefined): PoffoTouch | undefined => {
  if (settings === undefined) {
    return undefined
  }
  const {parameters} = settings
  return {
    ...settings,
    chains: touchJointChains(settings).map((chain) => ({
      ...chain,
      joints: chain.joints.map((joint) => ({...joint})),
    })),
    jointResponse: settings.jointResponse === undefined ? undefined : {...settings.jointResponse},
    parameters:
      parameters === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(parameters).map(([id, binding]) => [
              id,
              {
                ...binding,
                parts: binding.parts?.slice(),
              },
            ]),
          ),
  }
}
