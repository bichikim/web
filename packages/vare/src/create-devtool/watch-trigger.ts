import {Info, useInfo} from 'src/info'
import {watch} from 'vue-demi'

export const watchTrigger = (targets?: Record<string, any>, callback?: (args: any[], info?: Info) => unknown) => {
  const info = useInfo()

  if (!targets) {
    return
  }

  Object.keys(targets).forEach((key) => {
    const value = targets[key]
    const targetInfo = info.get(value)
    const trigger = targetInfo?.watchTrigger
    const relates = targetInfo?.relates

    if (trigger) {
      watch(trigger, (args: any[]) => {
        callback?.(args, info.get(value))
      })
    }

    if (relates) {
      relates.forEach((value) => {
        const relateInfo = info.get(value)

        const trigger = relateInfo?.watchTrigger

        if (trigger) {
          watch(trigger, (args: any[]) => {
            callback?.(args, info.get(value))
          })
        }
      })
    }
  })
}
