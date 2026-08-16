import {type Accessor, createMemo} from 'solid-js'

import {type PGaze, resolvePSceneGaze} from './pomo-scene-options'

/** Resolves the temporary user-facing gaze only while speech playback is active. */
export const useDialogueSceneGaze = (
  configuredGaze: Accessor<PGaze>,
  isDialoguePlaying: Accessor<boolean>,
  isExternalSpeechPlaying: Accessor<boolean>,
): Accessor<PGaze> =>
  createMemo(() =>
    resolvePSceneGaze(configuredGaze(), isDialoguePlaying() || isExternalSpeechPlaying()),
  )
