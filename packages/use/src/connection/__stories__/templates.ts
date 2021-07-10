import {useConnection} from '../'
import {h} from 'vue-demi'

export const Default = () => ({
  setup() {
    const valueRef = useConnection(true)

    return () => (
      h('div', [
        h('div', valueRef.value),
      ])
    )
  },
})
