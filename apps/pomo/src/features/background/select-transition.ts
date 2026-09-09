import type {BackgroundPreferences, TransitionEffect} from './model'

/** Chooses one enabled effect for the next screen transition. */
export const selectTransition = (preferences: BackgroundPreferences): TransitionEffect => {
  if (!preferences.randomTransitions) {
    return preferences.transition
  }
  const pool = preferences.transitionPool
  return pool[Math.floor(Math.random() * pool.length)] ?? 'fade'
}

/** Returns the active effect selection, including legacy fixed settings. */
export const getTransitionSelection = (preferences: BackgroundPreferences) => {
  if (preferences.randomTransitions) {
    return preferences.transitionPool
  }
  return preferences.transition === 'none' ? [] : [preferences.transition]
}

/** Converts a selection into persisted playback preferences. */
export const transitionSelectionPatch = (
  effects: readonly Exclude<TransitionEffect, 'none'>[],
): Partial<BackgroundPreferences> => ({
  randomTransitions: effects.length > 1,
  transition: effects[0] ?? 'none',
  ...(effects.length > 0 ? {transitionPool: effects} : {}),
})
