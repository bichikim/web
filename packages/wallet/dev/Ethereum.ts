import {createEthereumWallet} from 'src/ethereum'
import {computed, defineComponent, h, ref} from 'vue'

export const Ethereum = defineComponent({
  setup() {
    const ethereum = createEthereumWallet()
    const signature = ref()

    const address = computed(() => {
      return ethereum.accountAddress
    })

    const sign = async () => {
      signature.value = await ethereum.sign('hello')
    }

    const save = () => {
      return ethereum.saveAccount('foo-bar', (progress) => console.log(progress))
    }

    const createNewAccount = () => {
      ethereum.createAccount()
    }
    return () => (
      h('div', [
        h('div', {}, address.value),
        h('div', {}, signature.value),
        h('button', {onClick: sign}, 'sign'),
        h('button', {onClick: save}, 'save'),
        h('button', {onClick: createNewAccount}, 'createNewAccount'),
      ])
    )
  },
})
