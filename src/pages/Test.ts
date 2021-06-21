import {computed, defineComponent, h} from 'vue'
import {TImg} from 'components/TImg'
import {Box} from 'src/design-system'

export const Test = defineComponent({
  name: 'Test',
  setup: () => {
    const list = computed(() => {
      // eslint-disable-next-line no-magic-numbers
      return Array(1000).fill(null).map((_, index) => {
        return `foo ${index}`
      })
    })

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const onClick = () => {
      console.log('hook')
    }

    return () => (
      h('div', [
        'hello?',
        h(Box, {backgroundColor: 'red', height: '100px', width: '100px'}),
        h(TImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}),
        list.value.map((item) => {
          return h(Box, {
            backgroundColor: 'red', height: 20, key: item, onclick: onClick,
          }, () => item)
        }),
      ])
    )
  },
})

export default Test
