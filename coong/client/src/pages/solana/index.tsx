import {computed, defineComponent} from 'vue'
import {HBtn, HInput, HPage} from '@winter-love/hyper-components'
import {useSolana} from 'hooks/solana'
import {debug} from 'hooks/debug'
import {useUser} from 'src/store/user'

export const Solana = defineComponent({
  name: 'Solana',
  setup() {
    const solana = useSolana()
    const user = useUser()
    const email = computed(() => user.email)
    const cryptoSignMessage = computed(() => user.cryptoSignMessage)
    debug({
      connected: solana.connected,
      email,
      publicKey: solana.publicKey,
    })
    const updateEmail = (email: string | number | null) => {
      user.email = email
    }
    return () => (
      <HPage css={{color: 'black'}}>
        <HBtn onClick={solana.connect}>connect</HBtn>
        <HBtn onClick={solana.disconnect}>disconnect</HBtn>
        <HBtn onClick={user.getCryptoSignMessage}>getCryptoSignMessage</HBtn>
        <HInput label="email" modelValue={email.value} onUpdate:modelValue={updateEmail} />
        <div>{String(solana.connected.value)}</div>
        <div>{String(solana.publicKey.value)}</div>
        <div>{cryptoSignMessage.value}</div>
        <div>foo</div>
      </HPage>
    )
  },
})

export default Solana
