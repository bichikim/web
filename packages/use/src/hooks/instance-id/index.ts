import {getCurrentInstance, onMounted, ref} from 'vue'
import {getWindow} from '@winter-love/utils'

/**
 * 인스턴트 유니크 아이디를 반환합니다
 * @warning do not use in SSR environments
 */
export const useInstanceId = () => {
  const id = ref()

  if (!getWindow()) {
    console.warn('Do not use in SSR environment')
  }

  const instance = getCurrentInstance()

  if (!instance) {
    console.warn('Do not use outside of a component')
  }

  id.value = instance?.uid

  onMounted(() => {
    id.value = instance?.uid
  })

  return id
}
