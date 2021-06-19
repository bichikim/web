import {ref, Ref} from 'vue-demi'
import {freeze} from '@winter-love/utils'

export type AsyncRefRecipe<Args extends any[], Return> = (...args: Args) => Promise<Return> | Return

export interface AsyncRefReturnType<Args extends any[], Return> {
  error: Ref<undefined | any>
  execute(...args: Args): Promise<Return>
  isInProgress: Ref<boolean>
  value: Ref<undefined| Return>
}

export const asyncRef = <Args extends any[], Return>(
  recipe: AsyncRefRecipe<Args, Return>,
): Readonly<AsyncRefReturnType<Args, Return>> => {
  const isInProgress = ref(false)
  const error = ref<undefined | any>()
  const value = ref<Return>()

  const execute = async (...args: Args): Promise<Return> => {
    isInProgress.value = true
    try {
      const result = await recipe(...args)
      value.value = result
      isInProgress.value = false
      return result
    } catch (_error) {
      isInProgress.value = false
      error.value = _error
      throw _error
    }
  }

  return freeze({
    error,
    execute,
    isInProgress,
    value,
  })
}
