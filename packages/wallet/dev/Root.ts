import {defineComponent, h} from 'vue'
import {createEthereumWallet} from 'src/ethereum'
import {createKlaytnWallet} from 'src/klaytn'

export const Root = defineComponent({
  setup() {
    const ethereum = createEthereumWallet()
    const klaytn = createKlaytnWallet('http://api.baobab.klaytn.net:8651')
    const createWallet = async () => {
      ethereum.createAccount()

    }
    const createKlaytn = async () => {
      klaytn.createAccount()
    }
    const save = async () => {
      await ethereum.saveAccount('foo-bar', (value) => {
        console.log(value)
      })
    }
    const sign = async () => {
      const result = await ethereum.sign('hello-there?')
      console.log(result)
    }
    const signKlaytn = async () => {
      const result = await klaytn.sign('hello-there?')
      console.log(result)
    }
    return () => (
      h('div', [
        'hello',
        h('button', {onClick: () => createWallet()}, 'createWallet'),
        h('button', {onClick: () => createKlaytn()}, 'createKlaytn'),
        h('button', {onClick: () => save()}, 'save'),
        h('button', {onClick: () => sign()}, 'sign'),
        h('button', {onClick: () => signKlaytn()}, 'signKlaytn'),
      ])
    )
  },
})
