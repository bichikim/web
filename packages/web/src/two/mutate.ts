import {fireSubscribe} from './subscribe'

export type MutationRecipe<Args extends any[], Return> = (...args: Args) => Return

export const MUTATION_IDENTIFIER = Symbol('mutate')

export type Mutation<Args extends any[], Return = any> = (...args: Args) => Return & {
  [MUTATION_IDENTIFIER]: boolean
}

export const mutate = <Args extends any[], Return>(
  recipe: MutationRecipe<Args, Return>,
): Mutation<Args> => {
  const self = (...args: Args): Return => {
    fireSubscribe(self, ...args)
    return recipe(...args)
  }

  return Object.assign(self, {
    [MUTATION_IDENTIFIER]: true,
  })
}
