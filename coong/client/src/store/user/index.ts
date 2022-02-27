import {atom, getter} from 'vare'
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

export interface UserState {
  email?: string
  hasCookieToken?: boolean
  name?: string
  test?: string
  token?: string
}

const state: UserState = {
  name: 'unknown',
}

export const user = atom(state, {
  async getUser(user, token: string = user.token, email: string = user.email) {
    if (!email) {
      return
    }

    const headers: Record<string, any> = {}

    if (token) {
      headers.authorization = `Bearer ${token}`
    }

    const response = await pipe(
      client.executeQuery(
        createRequest(GetUserDocument, {email}), {fetchOptions: {headers}},
      ),
      take(1),
      toPromise,
    )

    const {email: _email, name} = response.data.user ?? {}

    user.hasCookieToken = email === _email
    if (name) {
      user.name = name
    }
  },
  hasEmail: getter((user) => {
    return Boolean(user.email)
  }),
  isAuthenticated: getter((user) => {
    return Boolean(user.token)
  }),
  async signIn(user, email: string, password: string) {
    const signInResponse = await pipe(
      client.executeMutation(createRequest(SignInDocument, {email, password})),
      take(1),
      toPromise,
    )
    const {message, sessionToken} = signInResponse.data?.authentiocateUserWithPassword ?? {}
    if (sessionToken) {
      user.token = sessionToken
    }
    return {message, token: sessionToken}
  },
  async signInWithEmailOnly(user, email: string) {
    await pipe(
      client.executeMutation(createRequest(SignUpDocument, {input: {email}})),
      take(1),
      toPromise,
    )
    const signInResponse = await pipe(
      client.executeMutation(createRequest(EmailSignInDocument, {email})),
      take(1),
      toPromise,
    )
    user.email = email
    return signInResponse.data.sendUserMagicAuthLink
  },
  async signInWithEmailToken(user, email: string, _token: string) {
    const signInResponse = await pipe(
      client.executeMutation(createRequest(EmailTokenSignInDocument, {email, token: _token})),
      take(1),
      toPromise,
    )

    const {code, message, token} = signInResponse.data?.redeemUserMagicAuthToken ?? {}
    if (token) {
      user.token = token
    }
    return {code, message, token}
  },
})

