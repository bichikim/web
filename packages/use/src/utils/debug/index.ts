import {getCurrentInstance, reactive, UnwrapNestedRefs} from 'vue'

declare module 'vue' {
  interface ComponentInternalInstance {
    setupState: UnwrapNestedRefs<Record<string, any>>
  }
}

export const debug =
  process.env.NODE_ENV === 'production'
    ? () => {
        // empty
      }
    : (states: Record<string, any>) => {
        const instance = getCurrentInstance()
        if (instance) {
          instance.setupState = reactive({...states, ...instance.setupState})
        }
      }
