import {getCurrentInstance, reactive, UnwrapNestedRefs} from 'vue'

declare module 'vue' {
  interface ComponentInternalInstance {
    setupState: UnwrapNestedRefs<Record<string, any>>
  }
}

export const debug = __DEV__ ? (states: Record<string, any>) => {
  const instance = getCurrentInstance()
  if (instance) {
    instance.setupState = reactive({...states, ...instance.setupState})
  }
} : () => {
  // empty
}
