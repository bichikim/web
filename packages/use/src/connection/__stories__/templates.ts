import {useConnection} from '../'
import {h} from 'vue'

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
