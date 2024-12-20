import {h, ref} from 'vue'
import {onClickOutside} from '../'

export default {
  title: 'use/onClickOutside',
}

export const Default = () => ({
  setup() {
    const countRef = ref(0)
    const targetRef = ref()

    onClickOutside(targetRef, () => {
      countRef.value += 1
    })

    return () =>
      h('div', [
        h('span', countRef.value),
        h(
          'button',
          {
            ref: targetRef,
            style: {backgroundColor: 'blue'},
          },
          'toggle value',
        ),
      ])
  },
})
