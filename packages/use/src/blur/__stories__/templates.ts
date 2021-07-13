import {useBlur} from '../'
import {h, onBeforeUnmount} from 'vue-demi'

export const Default = () => ({
  setup() {
    const blur = useBlur()

    const intervalHandel = setInterval(() => {
      blur()
      // eslint-disable-next-line no-magic-numbers
    }, 5000)

    onBeforeUnmount(() => {
      clearInterval(intervalHandel)
    })

    return () => (
      h('div', [
        h('input'),
      ])
    )
  },
})
