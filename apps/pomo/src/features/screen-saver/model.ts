import type {Accessor} from 'solid-js'

const FIVE_SECONDS_MILLISECONDS = 5_000
const MINUTE_MILLISECONDS = 60_000
const TEN_MINUTES_MILLISECONDS = 600_000
const TWENTY_MINUTES_MILLISECONDS = 1_200_000
const HOUR_MILLISECONDS = 3_600_000

export type ScreenSaverDelay = 'off' | '5s' | '1m' | '10m' | '20m' | '1h'

export interface ScreenSaverController {
  readonly delay: Accessor<ScreenSaverDelay>
  readonly isActive: Accessor<boolean>
  readonly onDelayChange: (delay: ScreenSaverDelay) => void
  readonly onDismiss: () => void
}

/** Converts a screen saver preference into an inactivity duration. */
export const getScreenSaverDelayMilliseconds = (delay: ScreenSaverDelay): number | null => {
  switch (delay) {
    case 'off':
      return null
    case '5s':
      return FIVE_SECONDS_MILLISECONDS
    case '1m':
      return MINUTE_MILLISECONDS
    case '10m':
      return TEN_MINUTES_MILLISECONDS
    case '20m':
      return TWENTY_MINUTES_MILLISECONDS
    case '1h':
      return HOUR_MILLISECONDS
  }

  const exhaustiveDelay: never = delay
  return exhaustiveDelay
}
