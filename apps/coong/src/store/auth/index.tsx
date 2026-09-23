import {
  changePasswordAction,
  deleteAccountAction,
  resetPasswordAction,
  type Session,
  signInAction,
  type SignInPayload,
  signOutAction,
  userQuery,
  verifyOtpAction,
  type VerifyOtpPayload,
} from 'src/features/auth'
import {createContext, type JSX, useContext} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {AccessorWithLatest, createAsync, revalidate, useAction} from '@solidjs/router'
import {withHandyQuery} from 'src/use/handy-query'

export interface AuthContext {
  changePassword(newPassword: string): Promise<User | null>
  deleteAccount: () => Promise<{success: boolean}>
  resetPassword: (email: string) => Promise<void>
  signInWithPassword: (
    params: SignInPayload,
  ) => Promise<{user: User | null; session: Session | null}>
  signOut: () => Promise<void>
  user: AccessorWithLatest<User | null | undefined>
  verifyOtp: (payload: VerifyOtpPayload) => Promise<User | null>
}

const AuthContext = createContext<AuthContext>({
  changePassword: () => Promise.resolve(null),
  deleteAccount: () => Promise.resolve({success: false}),
  resetPassword: () => Promise.resolve(),
  signInWithPassword: (params: SignInPayload) => Promise.resolve({session: null, user: null}),
  signOut: () => Promise.resolve(),
  user: Object.assign(() => null, {latest: null}) satisfies AccessorWithLatest<
    User | null | undefined
  >,
  verifyOtp: () => Promise.resolve(null),
})

export interface AuthProviderProps {
  children: JSX.Element
}

export const useUserQuery = withHandyQuery(userQuery)

const revalidateUser = async () => {
  await revalidate(userQuery.key)
}

export function AuthProvider(props: AuthProviderProps) {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const changePassword = useAction(changePasswordAction)
  const runVerifyOtp = useAction(verifyOtpAction)
  const resetPassword = useAction(resetPasswordAction)
  const runSignInWithPassword = useAction(signInAction)
  const runSignOut = useAction(signOutAction)
  const runDeleteAccount = useAction(deleteAccountAction)

  const verifyOtp: AuthContext['verifyOtp'] = async (payload) => {
    const user = await runVerifyOtp(payload)

    await revalidateUser()

    return user
  }

  const signInWithPassword: AuthContext['signInWithPassword'] = async (params) => {
    const result = await runSignInWithPassword(params)

    await revalidateUser()

    return result
  }

  const signOut: AuthContext['signOut'] = async () => {
    await runSignOut()
    await revalidateUser()
  }

  const deleteAccount: AuthContext['deleteAccount'] = async () => {
    const result = await runDeleteAccount()

    await revalidateUser()

    return result
  }

  return (
    <AuthContext.Provider
      value={{
        changePassword,
        deleteAccount,
        resetPassword,
        signInWithPassword,
        signOut,
        user,
        verifyOtp,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
