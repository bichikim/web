import {computed, toRefs, unref} from 'vue'

export const reactiveRef = (data) => {
  const refs = toRefs(data)

  return computed(() => {
    return Object.fromEntries(
      Object.entries(refs).map(([key, value]) => {
        return [key, unref(value)]
      }),
    )
  })
}

export const reactiveToRef = reactiveRef
