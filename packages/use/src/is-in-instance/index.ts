import {getCurrentInstance} from 'vue-demi'

export const isInInstance = () => {
  return Boolean(getCurrentInstance())
}
