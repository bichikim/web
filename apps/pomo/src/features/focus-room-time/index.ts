export type ScenePeriod = 'day' | 'night'
export type SceneTimeMode = 'auto' | ScenePeriod

const DAY_START_HOUR = 7
const NIGHT_START_HOUR = 19

export const getAutomaticScenePeriod = (date: Date): ScenePeriod => {
  const hour = date.getHours()

  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'day' : 'night'
}

export const getNextTimeMode = (mode: SceneTimeMode): SceneTimeMode => {
  switch (mode) {
    case 'day':
      return 'night'
    case 'night':
      return 'auto'
    case 'auto':
      return 'day'
    default: {
      const unexpectedMode: never = mode
      throw new Error(`Unsupported scene time mode: ${unexpectedMode}`)
    }
  }
}

export const resolveScenePeriod = (
  mode: SceneTimeMode,
  automaticPeriod: ScenePeriod,
): ScenePeriod => (mode === 'auto' ? automaticPeriod : mode)
