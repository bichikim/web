import {atom, getter} from 'vare'
import {EmailSignInDocument, SignInDocument, SignUpDocument} from 'src/graphql'
import {client} from 'src/plugins/urql'
import {createRequest} from '@urql/vue'
import {pipe, take, toPromise} from 'wonka'

export interface UserState {
  email?: string
  name?: string
  test?: string
  token?: string
}

export const user = atom({
  name: 'unknown',
} as UserState, {
  hasEmail: getter(() => {
    return Boolean(user.email)
  }),
  isSignIn: getter(() => {
    return Boolean(user.token)
  }),
  async signIn(user, email: string, password: string) {
    const result = await pipe(
      client.executeMutation(createRequest(SignInDocument, {email, password})),
      take(1),
      toPromise,
    )
    console.log(result)
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
})
