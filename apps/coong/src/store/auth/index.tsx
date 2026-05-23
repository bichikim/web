import {createContext, type JSX, useContext} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {userQuery} from 'src/requests/auth/user'
import {Session, signInAction} from 'src/requests/auth/sign-in'
import {signOutAction} from 'src/requests/auth/sign-out'
import {changePasswordAction} from 'src/requests/auth/change-password'
import {resetPasswordAction} from 'src/requests/auth/reset-password'
import {deleteAccountAction} from 'src/requests/auth/delete-account'
import {AccessorWithLatest, createAsync, revalidate, useAction} from '@solidjs/router'
import {withHandyQuery} from 'src/use/handy-query'
import {verifyOtpAction, type VerifyOtpPayload} from 'src/requests/auth/verify-otp'

export interface AuthContext {
  changePassword(newPassword: string): Promise<User | null>
  deleteAccount: () => Promise<{success: boolean}>
  resetPassword: (email: string) => Promise<void>
  signInWithPassword: (params: {
    email: string
    password: string
  }) => Promise<{user: User | null; session: Session | null}>
  signOut: () => Promise<void>
  user: AccessorWithLatest<User | null | undefined>
  verifyOtp: (payload: VerifyOtpPayload) => Promise<User | null>
}

const AuthContext = createContext<AuthContext>({
  changePassword: () => Promise.resolve(null),
  deleteAccount: () => Promise.resolve({success: false}),
  resetPassword: () => Promise.resolve(),
  signInWithPassword: (params: {email: string; password: string}) =>
    Promise.resolve({session: null, user: null}),
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

export function AuthProvider(props: AuthProviderProps) {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const changePassword = useAction(changePasswordAction)
  const runVerifyOtp = useAction(verifyOtpAction)
  const resetPassword = useAction(resetPasswordAction)
  const runSignInWithPassword = useAction(signInAction)
  const runSignOut = useAction(signOutAction)
  const runDeleteAccount = useAction(deleteAccountAction)

  const revalidateUser = async () => {
    await revalidate(userQuery.key)
  }

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
