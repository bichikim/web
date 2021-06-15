import {defineComponent, h} from 'vue'
import {TImg} from 'components/TImg'

export const Test = defineComponent({
  setup: () => {
    return () => (
      h('div', [
        'hello?',
        h(TImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}),
      ])
    )
  },
})

export default Test
