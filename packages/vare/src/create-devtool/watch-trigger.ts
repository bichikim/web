import {getGlobalInfo, getTrigger, VareInfo} from 'src/info'
import {watch} from 'vue-demi'

export const watchTrigger = (targets: Record<string, any>, callback?: (info?: VareInfo<any>) => unknown) => {
  const info = getGlobalInfo()

  if (!info) {
    return
  }

  Object.keys(targets).forEach((key) => {
    const value = targets[key]
    const trigger = getTrigger(info, value)

    if (!trigger) {
      return
    }

    watch(trigger, () => {
      callback?.(info.get(value))
    })
  })
}
