import {createStore} from 'vare'

export const useAge = createStore({
  name: 'age',
  setup: () => {
    const age = ref(10)
    return {
      age,
    }
  },
})

export const useUser = createStore({
  name: 'user',
  setup: () => {
    const {age} = toRefs(useAge())
    const name = ref('foo')
    return {
      age,
      name,
    }
  },
})
