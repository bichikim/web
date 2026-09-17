import {visibility} from 'src/utils/visibility'

export interface LocalDateRuntime {
  readonly schedule: (callback: () => void, delay: number) => () => void
  readonly subscribe: (callback: (isHidden: boolean) => void) => () => void
}

export const localDateRuntime: LocalDateRuntime = {
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  },
  subscribe: visibility,
}
