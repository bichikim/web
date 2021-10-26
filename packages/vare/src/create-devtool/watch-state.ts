import {Info, useInfo} from 'src/info'
import {watch} from 'vue-demi'

export const watchState = (targets?: Record<string, any>, callback?: (info?: Info) => unknown) => {
  const info = useInfo()

  if (!targets) {
    return
  }

  Object.keys(targets).forEach((key) => {
    const value = targets[key]
    const state = value

    if (typeof state !== 'object') {
      return
    }

    watch(state, () => {
      callback?.(info.get(value))
    })
  })
}
