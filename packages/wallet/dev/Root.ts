import {defineComponent, h} from 'vue'
import {Ethereum} from './Ethereum'
import {Solana} from './Solana'

export const Root = defineComponent({
  setup() {
    return () =>
      h('div', [
        'hello wallet world',
        h('div', ['Solana', h(Solana)]),
        h('div', ['Ethereum', h(Ethereum)]),
      ])
  },
})
