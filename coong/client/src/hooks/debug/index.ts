import {getCurrentInstance, onMounted, reactive, UnwrapNestedRefs} from 'vue-demi'

declare module 'vue' {
  interface ComponentInternalInstance {
    setupState: UnwrapNestedRefs<Record<string, any>>
  }
}

export const debug =
  // eslint-disable-next-line no-negated-condition
  process.env.NODE_ENV !== 'production'
    ? (states: Record<string, any>) => {
        const instance = getCurrentInstance()
        onMounted(() => {
          console.log(instance)
        })
        if (instance) {
          instance.setupState = reactive({...states, ...instance.setupState})
        }
      }
    : () => {
        // empty
      }
