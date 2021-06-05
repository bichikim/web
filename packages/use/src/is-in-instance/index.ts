import {getCurrentInstance} from 'vue'

export const isInInstance = () => {
  return Boolean(getCurrentInstance())
}
