import {Meta, StoryFn} from '@storybook/vue3'
import {computed, h, ref} from 'vue'
import {getStyle} from '../'
export default {
  title: 'utils/dom/get-style',
} as Meta

export const Default: StoryFn = () => ({
  setup: () => {
    const element = ref(null)
    const style = computed(() => {
      const _element = element.value
      if (!_element) {
        return
      }
      return getStyle(_element, 'marginRight')
    })
    return () =>
      h(
        'div',
        {ref: element, style: {marginRight: '10px'}},
        `margin-right: ${style.value}`,
      )
  },
})
