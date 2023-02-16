import {h, onMounted, ref} from 'vue'
import {onDomMounted} from '../'

export default {
  title: 'use/onDomMounted',
}

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
