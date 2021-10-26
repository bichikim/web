import {Info, useInfo} from 'src/info'
import {watch} from 'vue-demi'

export const watchTrigger = (targets?: Record<string, any>, callback?: (info?: Info) => unknown) => {
  const info = useInfo()

  if (!targets) {
    return
  }

  Object.keys(targets).forEach((key) => {
    const value = targets[key]
    const targetInfo = info.get(value)
    const trigger = targetInfo?.watchTrigger

    if (!trigger) {
      return
    }

    watch(trigger, () => {
      callback?.(info.get(value))
    })
  })
}
