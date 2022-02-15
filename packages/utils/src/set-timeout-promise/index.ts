
export const asyncTimeout = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

/**
 * use asyncTimeout
 * @deprecated
 */
export const setTimeoutPromise = asyncTimeout
