import {
  computed, defineComponent, h, ref,
} from 'vue'
import {TImg} from 'components/TImg'
import {Box} from 'src/design-system'

const getList = (): Promise<any[]> => {
  return new Promise((resolve) => {
    const list = Array(1000).fill(null).map((_, index) => {
      return `foo ${index}`
    })
    resolve(list)
  })
}

export const Test = defineComponent({
  name: 'Test',
  setup: () => {
    const listRef = ref<any[]>([])

    getList().then((value) => {
      listRef.value = value
    })

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const onClick = () => {
      console.log('hook')
    }

    return () => (
      h('div', [
        'hello?',
        h(Box, {css: {backgroundColor: 'red', height: '100px', width: '100px'}}),
        h(TImg, {src: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}),
        listRef.value.map((item) => {
          return h(Box, {
            css: {
              backgroundColor: 'red', height: 20,
            },
            key: item,
            onclick: onClick,
          }, () => item)
        }),
      ])
    )
  },
})

export default Test
