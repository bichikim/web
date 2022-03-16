import {defineComponent} from 'vue'
import {HBtn, HPage} from '@winter-love/hyper-components'
import {useSolana} from 'hooks/solana'
import {debug} from 'hooks/debug'

export const Solana = defineComponent({
  name: 'Solana',
  setup() {
    const solana = useSolana()
    debug({
      connected: solana.connected,
      publicKey: solana.publicKey,
    })
    return () => (
      <HPage css={{color: 'black'}}>
        <HBtn onClick={solana.connect}>connect</HBtn>
        <HBtn onClick={solana.disconnect}>disconnect</HBtn>
        <div>{String(solana.connected.value)}</div>
        <div>{String(solana.publicKey.value)}</div>
        <div>foo</div>
      </HPage>
    )
  },
})

export default Solana
