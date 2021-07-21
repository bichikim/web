import {usePromise2} from '../'
import {h} from 'vue-demi'
import {setTimeoutPromise} from '@winter-love/utils'

export const Default = () => ({
  setup() {
    const {execute, data} = usePromise2((context) => {
      const {previousCount} = context
      // eslint-disable-next-line no-magic-numbers
      return setTimeoutPromise(1000).then(() => {
        return `foo ${previousCount}`
      })
    })

    return () => (
      h('div', [
        h('div', data.value),
        h('button', {onClick: () => execute()}, 'toggle value'),
      ])
    )
  },
})