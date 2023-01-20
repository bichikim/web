import {getCurrentInstance, reactive, UnwrapNestedRefs} from 'vue'

declare module 'vue' {
  interface ComponentInternalInstance {
    setupState: UnwrapNestedRefs<Record<string, any>>
  }
}

// eslint-disable-next-line no-negated-condition
export const debug =
  // eslint-disable-next-line no-negated-condition
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
