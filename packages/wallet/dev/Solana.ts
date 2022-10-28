import {createSolanaWallet} from 'src/solana'
import {computed, defineComponent, h, ref} from 'vue'

export const Solana = defineComponent({
  setup() {
    const solana = createSolanaWallet()
    const signature = ref()

    const address = computed(() => {
      return solana.accountAddress
    })

    const sign = async () => {
      signature.value = await solana.sign('hello')
    }

    const save = () => {
      return solana.saveAccount('foo-bar', (progress) => console.log(progress))
    }

    const createNewAccount = () => {
      solana.createAccount()
    }
    return () =>
      h('div', [
        h('span', {}, address.value),
        h('div', {}, signature.value),
        h('button', {onClick: sign}, 'sign'),
        h('button', {onClick: save}, 'save'),
        h('button', {onClick: createNewAccount}, 'createNewAccount'),
      ])
  },
})
