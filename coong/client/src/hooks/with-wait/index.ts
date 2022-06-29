/* eslint-disable functional/no-try-statement,functional/no-throw-statement */
import {Ref} from 'vue'

export interface WithWaitOptions {
  error?: (error: any) => any
  wait?: (value: boolean) => any
}

export const withWait = <Args extends any[], Result>(
  options: WithWaitOptions,
  fn: (...args: Args) => Promise<Result>,
): ((...args: Args) => Promise<Result>) => {
  const {wait, error: handleError} = options
  return async (...args: Args) => {
    try {
      wait?.(true)
      const result = await fn(...args)
      wait?.(false)
      return result
    } catch (error) {
      wait?.(false)
      handleError?.(error)
      throw error
    }
  }
}

export interface WithWaitRefOptions {
  error?: Ref<any>
  wait?: Ref<boolean>
}

export const withWaitRef = <Args extends any[], Result>(
  options: WithWaitRefOptions,
  fn: (...args: Args) => Promise<Result>,
) => {
  const {error: handleError, wait} = options
  return withWait(
    {
      error: (error) => {
        if (handleError) {
          handleError.value = error
        }
      },
      wait: (value) => {
        if (wait) {
          wait.value = value
        }
      },
    },
    fn,
  )
}
