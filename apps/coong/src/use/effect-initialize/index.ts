import {createEffect} from 'solid-js'

export const createEffectInitialize = (effect: (isInitial: boolean) => void) => {
  let isInitial = true

  createEffect(() => {
    effect(isInitial)
    isInitial = false
  })
}
