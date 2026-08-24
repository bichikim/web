import {createSignal, onCleanup, onMount} from 'solid-js'

import {
  DEFAULT_P_SCENE_PREFERENCES,
  type PActivity,
  type PGaze,
  type PScenePreferences,
  type PScenePreferencesController,
} from './model'
import {readPScenePreferences, writePScenePreferences} from './storage'

const persist = (preferences: PScenePreferences) => {
  writePScenePreferences(preferences).catch(globalThis.reportError)
}

/** Owns the browser-only lifecycle for persisted focus-room scene preferences. */
export const usePScenePreferences = (): PScenePreferencesController => {
  const [activity, setActivity] = createSignal<PActivity>(DEFAULT_P_SCENE_PREFERENCES.activity)
  const [gaze, setGaze] = createSignal<PGaze>(DEFAULT_P_SCENE_PREFERENCES.gaze)
  const [timeMode, setTimeMode] = createSignal<PScenePreferences['timeMode']>(
    DEFAULT_P_SCENE_PREFERENCES.timeMode,
  )
  const [isReady, setIsReady] = createSignal(false)
  let activityRevision = 0
  let gazeRevision = 0
  let timeModeRevision = 0

  const onActivityChange = (nextActivity: PActivity) => {
    activityRevision += 1
    setActivity(nextActivity)

    if (isReady()) {
      persist({activity: nextActivity, gaze: gaze(), timeMode: timeMode()})
    }
  }
  const onGazeChange = (nextGaze: PGaze) => {
    gazeRevision += 1
    setGaze(nextGaze)

    if (isReady()) {
      persist({activity: activity(), gaze: nextGaze, timeMode: timeMode()})
    }
  }
  const onTimeModeChange = (nextTimeMode: PScenePreferences['timeMode']) => {
    timeModeRevision += 1
    setTimeMode(nextTimeMode)

    if (isReady()) {
      persist({activity: activity(), gaze: gaze(), timeMode: nextTimeMode})
    }
  }

  onMount(() => {
    let active = true
    const initialActivityRevision = activityRevision
    const initialGazeRevision = gazeRevision
    const initialTimeModeRevision = timeModeRevision

    readPScenePreferences()
      .then((storedPreferences) => {
        if (!active) {
          return
        }

        if (activityRevision === initialActivityRevision) {
          setActivity(storedPreferences.activity)
        }
        if (gazeRevision === initialGazeRevision) {
          setGaze(storedPreferences.gaze)
        }
        if (timeModeRevision === initialTimeModeRevision) {
          setTimeMode(storedPreferences.timeMode)
        }
      })
      .catch(globalThis.reportError)
      .finally(() => {
        if (active) {
          const changedDuringRestore =
            activityRevision !== initialActivityRevision ||
            gazeRevision !== initialGazeRevision ||
            timeModeRevision !== initialTimeModeRevision

          setIsReady(true)

          if (changedDuringRestore) {
            persist({activity: activity(), gaze: gaze(), timeMode: timeMode()})
          }
        }
      })

    onCleanup(() => {
      active = false
    })
  })

  return {
    activity,
    gaze,
    isReady,
    onActivityChange,
    onGazeChange,
    onTimeModeChange,
    timeMode,
  }
}
