import {defineStore} from 'vare'
import {
  EmailSignInDocument,
  EmailTokenSignInDocument,
  GetUserDocument,
  SignInDocument,
  SignUpDocument,
} from 'src/graphql'
import {client} from 'src/plugins/urql'
import {createRequest} from '@urql/vue'
import {pipe, take, toPromise} from 'wonka'
import {computed, ref} from 'vue'

export const useUser = defineStore('user', () => {
  const hasCookieToken = ref(false)
  const name = ref<string | undefined>()
  const email = ref<string | undefined>()
  const token = ref<string | undefined>()
  const hasEmail = computed(() => {
    return Boolean(email.value)
  })
  const isAuthenticated = computed(() => {
    return Boolean(token.value)
  })
  async function getUser(token_: string | undefined = token.value, email_: string | undefined = email.value) {
    if (!email_) {
      return
    }

    const headers: Record<string, any> = {}

    if (token_) {
      headers.authorization = `Bearer ${token_}`
    }

    const response = await pipe(
      client.executeQuery(
        createRequest(GetUserDocument, {email: email_}), {fetchOptions: {headers}},
      ),
      take(1),
      toPromise,
    )

    const {email: _email, name} = response.data.user ?? {}

    hasCookieToken.value = email_ === _email
    if (name) {
      name.value = name
    }
  }

  async function signIn(email: string, password: string) {
    const signInResponse = await pipe(
      client.executeMutation(createRequest(SignInDocument, {email, password})),
      take(1),
      toPromise,
    )
    const {message, sessionToken} = signInResponse.data?.authentiocateUserWithPassword ?? {}
    if (sessionToken) {
      token.value = sessionToken
    }
    return {message, token: sessionToken}
  }

  async function signInWithEmailOnly(email_: string) {
    await pipe(
      client.executeMutation(createRequest(SignUpDocument, {input: {email: email_}})),
      take(1),
      toPromise,
    )
    const signInResponse = await pipe(
      client.executeMutation(createRequest(EmailSignInDocument, {email: email_})),
      take(1),
      toPromise,
    )
    email.value = email_
    return signInResponse.data.sendUserMagicAuthLink
  }

  async function signInWithEmailToken(email: string, token_: string) {
    const signInResponse = await pipe(
      client.executeMutation(createRequest(EmailTokenSignInDocument, {email, token: token_})),
      take(1),
      toPromise,
    )

    const {code, message, token: resultToken} = signInResponse.data?.redeemUserMagicAuthToken ?? {}
    if (resultToken) {
      token.value = resultToken
    }
    return {code, message, token}
  }

  return {
    email,
    getUser,
    hasEmail,
    isAuthenticated,
    name,
    signIn,
    signInWithEmailOnly,
    signInWithEmailToken,
    token,
  }
})

