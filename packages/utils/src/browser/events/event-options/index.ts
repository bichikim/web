import {isSupportPassive} from 'src/browser/events/is-support-passive'

export const eventOptions = (options: AddEventListenerOptions) => {
  return {
    ...options,
    passive: options.passive && isSupportPassive(),
  }
}
