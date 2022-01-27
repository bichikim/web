import {QPage} from 'quasar'
import {computed, defineComponent, h, ref} from 'vue'
import {AudioButton, BackdropFilterText, SignInButton} from './_components'
import {getSolana, getSolflare, useSolana} from 'src/use/solana'
import {user} from 'src/store/user'
import {className} from 'src/plugins/hyper-components'

const container = () => className({
  bottom: '46%',
  display: 'flex',
  flexDirection: 'column',
  left: '50%',
  position: 'absolute',
  transform: 'translate(-50%, +50%)',
})

const media = () => [
  className({
    alignItems: 'flex-end',
    color: 'mistyrose',
    display: 'flex',
    flexDirection: 'row',
    fontSize: '3rem',
    fontWeight: '900',
    position: 'reactive',
  }),
  className({
    '@bp1': {
      fontSize: '3rem',
    },
    '@bp2': {
      fontSize: '5rem',
    },
    '@bp3': {
      fontSize: '7rem',
    },
  }),
]

const signInContainer = () => className({
  bottom: '0',
  left: '50%',
  position: 'absolute',
  transform: 'translate(-50%, 100%)',
})

const wallets = {
  phantom: getSolana,
  solflare: getSolflare,
}

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    // const {connect, sign} = this

    return (
      h(QPage, () => [
        h('div', {
          class: className({alignItems: 'center', display: 'flex', justifyContent: 'center', width: '100%'}),
        }, [
          //
          h('div', {
            class: container(),
          }, [
            h('div', {
              class: media(),
            }, [
              [
                h(BackdropFilterText, {
                  class: className({
                    $$activeColor: 'rgba(200, 200, 200, 0.3)',
                    $$filter: 'blur(5px) hue-rotate(80deg)',
                  }),
                }, () => [
                  'Coong',
                ]),
                ///
                h(AudioButton),
                h('div', {class: signInContainer()}, [
                  h(SignInButton),
                ]),
              ],
            ]),
          ]),
        ]),
      ])
    )
  },
  setup() {
    const walletKindRef = ref<keyof typeof wallets>('solflare')
    const providerRef = computed(() => wallets[walletKindRef.value]())
    const solana = useSolana(providerRef)

    const connect = () => {
      return solana.connect()
    }

    const sign = () => {
      return solana.sign('coong coong coong')
    }

    return {
      connect,
      hasEmail: user.$.hasEmail,
      publicKey: solana.publicKey,
      sign,
      walletKindRef,
    }
  },
})

export default IndexPage
