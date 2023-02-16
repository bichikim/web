import {Meta, StoryFn} from '@storybook/vue3'
import {h, ref} from 'vue'

export default {
  title: 'coong/element-from-point',
} as Meta

export const Default: StoryFn = () => ({
  setup() {
    const element = ref(null)

    window.addEventListener('mousedown', () => {
      //
    })

    return () => h('div', {ref: element}, 'hello')
  },
})
