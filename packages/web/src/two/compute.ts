import {fireSubscribe} from './subscribe'
import {computed, watch} from 'vue'
import {ComputedGetter, WritableComputedRef, ComputedRef} from '@vue/reactivity'

export type ComputationName = 'compute'

export type ComputationRecipe<T> = ComputedGetter<T>

export type ComputationGetter<Args extends any[], Return> = (...args: Args) => Return
export type ComputationSetter<Args extends any[], Value> = (value: Value, ...args: Args) => any

export interface ComputationRecipeOptions<Args extends any[], Return> {
  get: ComputationGetter<Args, Return>
  set: ComputationSetter<Args, Return>
}

export const COMPUTATION_IDENTIFIER = Symbol('compute')
export type Computation<Args extends any[], T> = (...args: Args) => ComputedRef<T> & {[COMPUTATION_IDENTIFIER]: boolean}
export type ComputationWritable<Args extends any[], T> = (...args: Args) => WritableComputedRef<T> & {[COMPUTATION_IDENTIFIER]: boolean}

export function compute<Args extends any[], T>(recipe: ComputationRecipe<T>): Computation<Args, T>
export function compute<Args extends any[], T>(recipe: ComputationRecipeOptions<Args, T>): ComputationWritable<Args, T>
export function compute(recipe) {
  const self = (...args: any[]): any => {
    let computedValue

    // ComputationRecipe type
    if (typeof recipe === 'function') {
      computedValue = computed(() => recipe(...args))
    } else {
      // ComputationRecipeOptions type
      computedValue = computed({
        get: () => recipe.get(...args),
        set: (value) => recipe.set(value, ...args),
      })
    }

    watch(computedValue, (value) => {
      fireSubscribe(self, value)
    })

    return computedValue
  }

  // mark ComputationIdentifier
  return Object.assign(self, {
    [COMPUTATION_IDENTIFIER]: true,
  })
}
