import {createStore} from 'src/simple-store'
import {ref} from 'vue'

export const useUser = createStore({
  // name: 'foo',
  setup: () => {
    const name = ref('name')
    const addName = () => {
      name.value = `${name.value}--`
    }
    return {
      addName,
      name,
    }
  },
})
