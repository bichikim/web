import {onShouldUpdate} from '../'
import {h, ref} from 'vue'

export default {
  title: 'use/onShouldUpdate',
}

export const Default = () => ({
  setup() {
    const countRef = ref(0)
    const watchCountRef = ref(0)
    onShouldUpdate(
      () => {
        countRef.value += 1
      },
      {
        watchValue: watchCountRef,
      },
    )
    return () => {
      return h('div', [
        h('div', watchCountRef.value),
        h('button', {onClick: () => (watchCountRef.value += 1)}, 'increase watch'),
        h('div', countRef.value),
      ])
    }
  },
})
