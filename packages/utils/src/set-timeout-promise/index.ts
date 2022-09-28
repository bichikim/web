/**
 * use asyncTimeout
 * @deprecated
 */
export const setTimeoutPromise = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}
