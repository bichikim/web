import {onFocus} from '../'
import {h, ref} from 'vue'

export default {
  title: 'use/onFocus',
}

export const Default = () => ({
  setup() {
    const countRef = ref(0)
    onFocus(() => {
      countRef.value += 1
    })
    return () => {
      return h('div', [h('div', countRef.value)])
    }
  },
})
