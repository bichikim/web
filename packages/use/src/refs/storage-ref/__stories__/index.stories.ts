import {storageRef} from '../'
import {h, ref} from 'vue'

export default {
  title: 'use/storageRef',
}

export const Default = () => ({
  setup() {
    const originalFooRef = ref('foo')
    const storageFooRef = storageRef('local', 'foo', originalFooRef)

    const addDot = () => {
      storageFooRef.value += '.'
    }

    const reset = () => {
      storageFooRef.value = 'foo'
    }

    return () =>
      h('div', [
        h('div', `originalFoo ${originalFooRef.value}`),
        h('div', `storageFoo ${storageFooRef.value}`),
        h('button', {onClick: addDot}, 'change value'),
        h('button', {onclick: reset}, 'reset value'),
      ])
  },
})
