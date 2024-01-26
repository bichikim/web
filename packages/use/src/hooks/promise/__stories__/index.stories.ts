import {usePromise} from '../'
import {h} from 'vue'
import {setTimeoutPromise} from '@winter-love/utils'

export default {
  title: 'use/usePromise',
}

export const Default = () => ({
  setup() {
    const {execute, data} = usePromise((context) => {
      const {previous} = context
      // eslint-disable-next-line no-magic-numbers
      return setTimeoutPromise(1000).then(() => {
        return `foo ${previous.count}`
      })
    })

    return () =>
      h('div', [
        h('div', data.value),
        h('button', {onClick: () => execute()}, 'toggle value'),
      ])
  },
})
