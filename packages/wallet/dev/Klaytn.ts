import {createKlaytnWallet} from 'src/klaytn'
import {computed, defineComponent, h, ref} from 'vue'

export const Klaytn = defineComponent({
  setup() {
    const klaytn = createKlaytnWallet()
    const signature = ref()

    const address = computed(() => {
      return klaytn.accountAddress
    })

    const sign = async () => {
      signature.value = await klaytn.sign('hello')
    }

    const save = () => {
      return klaytn.saveAccount('foo-bar', (progress) => console.log(progress))
    }

    const createNewAccount = () => {
      klaytn.createAccount()
    }
    return () => (
      h('div', [
        h('span', {}, address.value),
        h('div', {}, signature.value),
        h('button', {onClick: sign}, 'sign'),
        h('button', {onClick: save}, 'save'),
        h('button', {onClick: createNewAccount}, 'createNewAccount'),
      ])
    )
  },
})
