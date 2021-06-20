import {defineComponent, h} from 'vue'
import {TImg} from 'components/TImg'
import {Box} from 'src/design-system'

export const Test = defineComponent({
  name: 'Test',
  setup: () => {
    return () => (
      h('div', [
        'hello?~?',
        h(Box, {backgroundColor: 'red', height: '100px', width: '100px'}),
        h(TImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}),
      ])
    )
  },
})

export default Test
