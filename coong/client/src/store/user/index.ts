import {useRequest} from 'boot/graphql-request'
import {AuthenticateUserWithCryptoSignatureMutation, SignInMethod} from 'src/graphql'
import {useWallet} from 'src/hooks/wallet'
import {defineStore} from 'vare'
import {toUndefined} from '@winter-love/utils'
import {computed, reactive, ref, toRefs} from 'vue'
export type AuthenticateUserWithCryptoSignatureResult
  = AuthenticateUserWithCryptoSignatureMutation['authenticateUserWithCryptoSignature']

export type Exist<T> = Exclude<T, null | undefined>

export type NonNullableField<T> = { [P in keyof T]: NonNullable<T[P]> }

export type UserInfo = Partial<NonNullableField<Exist<Exist<
  AuthenticateUserWithCryptoSignatureMutation['authenticateUserWithCryptoSignature']>['item']>>>

const shallowUpdate = <T extends Record<any, any>>(
  target: T,
  source: Partial<T>,
) => {
  Object.keys(source).forEach((key) => {
    (target as any)[key] = source[key]
  })
}

export const useUser = defineStore({
  name: 'user',
  setup() {
    const cryptoKind = ref('solana')
    const request = useRequest()
    const wallet = useWallet()
    const sessionTokenRef = ref<string | undefined>()
    const isSignIn = computed(() => {
      return Boolean(sessionTokenRef.value)
    })
    const method = ref<SignInMethod>('wallet')
    const userInfo = reactive<UserInfo>({})
    const emailRef = ref<string | undefined>()

    const signInWithCrypto = async () => {
      const email = emailRef.value
      if (!email) {
        return
      }
      await wallet.sign(email)
      const {
        signMessage,
        connected,
        signature,
        walletAddress,
      } = wallet
      if (!walletAddress || !signature || !connected || !signMessage) {
        return
      }
      const data = await request.authenticateUserWithCryptoSignature({
        input: {
          message: signMessage,
          publicKey: walletAddress,
          signature,
        },
      })
      const response = data.authenticateUserWithCryptoSignature
      if (!response) {
        return
      }
      const {sessionToken, item} = response
      if (!sessionToken || !item) {
        return
      }
      sessionTokenRef.value = sessionToken
      shallowUpdate(userInfo, Object.fromEntries(Object.entries(item).map(([key, value]) => [key, toUndefined(value)])))
    }

    const signInWithEmail = () => {
      //
    }

    const signInWithWebAuth = () => {
      //
    }

    const singIn = () => {
      switch (method.value) {
        case 'wallet':
          return signInWithCrypto()
        case 'email':
          return signInWithEmail()
        case 'web-auth':
          return signInWithWebAuth()
      }
    }

    return {
      ...toRefs(userInfo),
      cryptoKind,
      email: emailRef,
      isSignIn,
      method,
      sessionToken: sessionTokenRef,
      signInWithCrypto,
      singIn,
    }
  },
})
