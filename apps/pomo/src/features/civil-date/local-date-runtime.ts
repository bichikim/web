import {visibility} from 'src/utils/visibility'

export interface LocalDateRuntime {
  readonly now: () => Date
  readonly schedule: (callback: () => void, delay: number) => () => void
  readonly subscribe: (callback: (isHidden: boolean) => void) => () => void
}

export const localDateRuntime: LocalDateRuntime = {
  now: () => new Date(),
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  },
  subscribe: visibility,
}
