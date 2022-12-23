import {isSupportPassive} from 'src/env/is-support-passive'
export const eventOptions = (options: AddEventListenerOptions) => {
  return {
    ...options,
    passive: options.passive && isSupportPassive(),
  }
}
