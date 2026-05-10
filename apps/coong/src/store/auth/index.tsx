import {createContext, type JSX, useContext} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {userQuery} from 'src/requests/auth/user'
import {Session, signInAction} from 'src/requests/auth/sign-in'
import {signOutAction} from 'src/requests/auth/sign-out'
import {changePasswordAction} from 'src/requests/auth/change-password'
import {resetPasswordAction} from 'src/requests/auth/reset-password'
import {deleteAccountAction} from 'src/requests/auth/delete-account'
import {AccessorWithLatest, createAsync, useAction} from '@solidjs/router'
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
  user: (Object.assign(() => null, {latest: null})) satisfies AccessorWithLatest<User | null | undefined>,
  verifyOtp: () => Promise.resolve(null),
})

export interface AuthProviderProps {
  children: JSX.Element
}

export const useUserQuery = withHandyQuery(userQuery)

export function AuthProvider(props: AuthProviderProps) {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const changePassword = useAction(changePasswordAction)
  const verifyOtp = useAction(verifyOtpAction)
  const resetPassword = useAction(resetPasswordAction)
  const signInWithPassword = useAction(signInAction)
  const signOut = useAction(signOutAction)
  const deleteAccount = useAction(deleteAccountAction)

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
