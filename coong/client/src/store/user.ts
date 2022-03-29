import {createStore} from 'vare'
import {reactive, ref} from 'vue'
import {useCryptoSign} from './modules/crypto-sign'

export const useUser = createStore({
  name: 'user',
  setup() {
    const email = ref<string | number | null>()
    const {signInWithWallet: _signInWithWallet} = useCryptoSign(reactive({email}))
    const info = ref()
    const sessionTokenRef = ref()

    const signInWithWallet = async () => {
      const result = await _signInWithWallet()
      if (result) {
        const {item, sessionToken} = result
        if (item) {
          info.value = item
        }
        if (sessionToken) {
          sessionTokenRef.value = sessionToken
        }
      }
    }

    return {
      email,
      sessionToken: sessionTokenRef,
      signInWithWallet,
    }
  },
})
