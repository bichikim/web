import {useConnection} from '../'
import {h} from 'vue'

export default {
  title: 'use/useConnection',
}

export const Default = () => ({
  setup() {
    const valueRef = useConnection(true)

    return () => h('div', [h('div', valueRef.value)])
  },
})
