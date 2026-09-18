import {type Accessor, createContext, useContext} from 'solid-js'

import type {SoundEffectPlayback} from './use-sound-effect'
import type {SoundEffect} from './types'

export type SoundEffectsStatus = 'failed' | 'loading' | 'ready'

export interface SoundEffectsController {
  readonly activate: () => void
  readonly effects: Accessor<readonly SoundEffect[]>
  readonly getPlayback: (effectId: string) => SoundEffectPlayback | undefined
  readonly status: Accessor<SoundEffectsStatus>
}

export const SoundEffectsContext = createContext<SoundEffectsController>()

/** Reads the app-owned sound-effects controller when the provider is present. */
export const useOptionalSoundEffects = (): SoundEffectsController | undefined =>
  useContext(SoundEffectsContext)

/** Reads the app-owned sound-effects controller. */
export const useSoundEffects = (): SoundEffectsController => {
  const controller = useOptionalSoundEffects()
  if (controller === undefined) {
    throw new Error('SoundEffectsProvider is required')
  }
  return controller
}
