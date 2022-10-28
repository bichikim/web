import {defineComponent, h} from 'vue'
import {Solana} from './Solana'
import {Ethereum} from './Ethereum'

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
