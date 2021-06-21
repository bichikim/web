import {defineComponent, h, computed} from 'vue'
import {TImg} from 'components/TImg'
import {Box} from 'src/design-system'

export const Test = defineComponent({
  name: 'Test',
  setup: () => {
    const list = computed(() => {
      // eslint-disable-next-line no-magic-numbers
      return Array(100).fill(null).map((_, index) => {
        return `foo ${index}`
      })
    })
    return () => (
      h('div', [
        'hello?',
        h(Box, {backgroundColor: 'red', height: '100px', width: '100px'}),
        list.value.map((item) => {
          return h(Box, {key: item}, () => item)
        }),
        // h(TImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}),
      ])
    )
  },
})

export default Test
