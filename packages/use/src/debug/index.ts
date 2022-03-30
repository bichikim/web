import {getCurrentInstance, reactive, UnwrapNestedRefs} from 'vue-demi'

declare module 'vue' {
  interface ComponentInternalInstance {
    setupState: UnwrapNestedRefs<Record<string, any>>
  }
}

// eslint-disable-next-line no-negated-condition
export const debug = process.env.NODE_ENV !== 'production'
  ? (states: Record<string, any>) => {
    const instance = getCurrentInstance()
    if (instance) {
      instance.setupState = reactive({...states, ...instance.setupState})
    }
  } : () => {
  // empty
  }
