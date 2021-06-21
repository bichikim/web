import {computed, defineComponent, h} from 'vue'
import {Box} from 'src/design-system'
import {QItem} from 'quasar'

export const Test1 = defineComponent({
  name: 'Test1',
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
        h(QImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png', width: '100px'}),
        list.value.map((item) => {
          return h(QItem, {}, () => item)
        }),
      ])
    )
  },
})

export default Test1
