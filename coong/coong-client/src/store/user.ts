import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useUser = defineStore('user', () => {
  const name = ref()
  return {
    name,
  }
})
