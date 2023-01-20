import {throttle} from '@winter-love/lodash'
import {createUseDelay} from 'src/use-delay'

export const useThrottle = createUseDelay((handle, wait, immediate) =>
  throttle(handle, wait, {
    leading: immediate,
  }),
)
