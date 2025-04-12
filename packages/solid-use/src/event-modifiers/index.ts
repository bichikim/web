/**
 * stop event propagation HOF
 */
export const stopPropagation =
  <E extends Event>(callback?: (event: E) => void) =>
  (event: E) => {
    event.stopPropagation()
    callback?.(event)
  }
