import {supportsPassiveEvents} from 'src/browser/events/supports-passive-events'

export const normalizeEventOptions = (
  options: AddEventListenerOptions,
): AddEventListenerOptions | boolean => {
  if (supportsPassiveEvents()) {
    return options
  }

  // Legacy browsers coerce an options object to capture=true, so only pass the capture boolean.
  return options.capture ?? false
}

/** @deprecated Use `normalizeEventOptions` instead. */
export const eventOptions = normalizeEventOptions
