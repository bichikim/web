import {setCurrentSub} from 'alien-signals'

/**
 * untrack effect in recipe
 * @param recipe - effect recipe
 * @returns - result of recipe
 */
export const untrack = <T>(recipe: () => T): T => {
  const pausedSub = setCurrentSub(undefined)

  const result = recipe()

  setCurrentSub(pausedSub)

  return result
}
