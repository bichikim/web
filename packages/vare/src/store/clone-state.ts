import {reactive, toRefs, UnwrapNestedRefs} from 'vue'

export const cloneState = (state: Record<string, any>): UnwrapNestedRefs<Record<string, any>> => {
  const newState = reactive({})
  const _state = toRefs(state)
  Object.keys(_state).forEach((key) => {
    if (typeof _state[key].value === 'function') {
      return
    }
    newState[key] = _state[key]
  })
  return newState
}
