import {Ref, unref, UnwrapRef, watchEffect} from 'vue'
import {isNil} from 'lodash'

export type UnWrapEachRef<T extends any[]> = {
  [K in keyof T]: UnwrapRef<T[K]>
}

export type EagerUnWrapEachRef<T extends any[]> = {
  [K in keyof T]: NonNullable<UnwrapRef<T[K]>>
}

export function watchUpdate<T extends Ref<any>>(
  target: T,
  recipe: ((target: NonNullable<UnwrapRef<T>>) => unknown),
)
export function watchUpdate<T extends Ref<any>[]>(
  targets: [...T],
  recipe: ((target: EagerUnWrapEachRef<T>) => unknown),
)
export function watchUpdate(
  target: any,
  recipe: ((target: any) => unknown),
) {
  watchEffect(() => {
    let targetValue
    if (Array.isArray(target)) {
      const targets = target.map((value) => unref(value))

      if (targets.every((value) => !isNil(value))) {
        targetValue = targets
      }
    } else {
      targetValue = unref(target)
    }

    if (targetValue) {
      recipe(targetValue)
    }
  })
}
