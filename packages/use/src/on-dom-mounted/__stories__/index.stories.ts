import {h, onMounted, ref} from 'vue-demi'
import {onDomMounted} from '../'

export const Default = () => ({
  setup() {
    const mountedRef = ref('')
    const domMountedRef = ref('')
    onDomMounted(() => {
      domMountedRef.value = document.readyState
    })
    onMounted(() => {
      mountedRef.value = document.readyState
    })
    return () => {
      return h('div', [
        h('div', `mounted: ${mountedRef.value}`),
        h('div', `dom mounted: ${domMountedRef.value}`),
      ])
    }
  },
})
