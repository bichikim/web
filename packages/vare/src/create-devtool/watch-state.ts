import {getGlobalInfo, getState, VareInfo} from 'src/info'
import {watch} from 'vue-demi'

export const watchState = (targets: Record<string, any>, callback?: (info?: VareInfo<any>) => unknown) => {
  const info = getGlobalInfo()

  if (!info) {
    return
  }

  Object.keys(targets).forEach((key) => {
    const value = targets[key]
    const state = getState(info, value)

    if (!state) {
      return
    }

    watch(state, () => {
      callback?.(info.get(value))
    })
  })
}
