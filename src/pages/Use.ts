import {defineComponent, h, ref, watch} from 'vue'
import {onAnimationRepeater, useBlur, useClipboard} from '@winter-love/use'

export const useProps = {}

export const Use = defineComponent({
  name: 'Use',
  props: useProps,
  setup() {
    const foo = ref(0)
    const bar = ref('')

    const blur = useBlur()
    const clipboard = useClipboard('')

    onAnimationRepeater(() => {
      foo.value += 1
    })

    watch(bar, (value) => {
      if (value[value.length - 1] === 'a') {
        blur()
      }
    })

    const setBar = (event) => {
      bar.value = event.target.value
    }
    const setClipboardValue = (event) => {
      clipboard.value.value = event.target.value
    }

    return () => {
      return (
        h('div', [
          h('div', [
            'onAnimationRepeater: ',
            String(foo.value),
          ]),
          h('div', [
            'useBlur: ',
            h('input', {onInput: setBar, value: bar.value}),
          ]),
          h('div', [
            'useClipboard: ',
            h('input', {onInput: setClipboardValue, value: clipboard.value.value}),
            h('button', {}, 'read'),
            h('button', {}, 'write'),
            h('span', `clipboard value ${clipboard.value.value}`),
          ]),
        ])
      )
    }
  },
})

export default Use
