import {createStore} from 'vare'
import {ref} from 'vue'

export const useUser = createStore('user', () => {
  const name = ref('')
  return {
    name,
  }
})
