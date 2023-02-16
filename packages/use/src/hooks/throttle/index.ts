import {throttle} from '@winter-love/lodash'
import {createUseDelay} from 'src/hooks/delay'

export const useThrottle = createUseDelay((handle, wait, immediate) =>
  throttle(handle, wait, {
    leading: immediate,
  }),
)
