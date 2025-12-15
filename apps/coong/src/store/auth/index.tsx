import {Accessor, createContext, createMemo, useContext, type JSX} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {userQuery} from 'src/requests/user'
import {signInAction} from 'src/requests/sign-in'
import {signOutAction} from 'src/requests/sign-out'
import {changePasswordAction} from 'src/requests/change-password'
import {resetPasswordAction} from 'src/requests/reset-password'
import {useSubmission, useAction, revalidate, createAsync} from '@solidjs/router'

const AuthContext = createContext<{
  changePassword: (newPassword: string) => Promise<void>
  changePasswordError: Accessor<Error | null>
  loading: Accessor<boolean>
  resetPassword: (email: string) => Promise<void>
  resetPasswordError: Accessor<Error | null>
  signInError: Accessor<Error | null>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signOutError: Accessor<Error | null>
  user: Accessor<User | null>
}>({
  changePassword: () => Promise.resolve(),
  changePasswordError: () => null,
  loading: () => false,
  resetPassword: () => Promise.resolve(),
  resetPasswordError: () => null,
  signInError: () => null,
  signInWithPassword: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  signOutError: () => null,
  user: () => null,
})

export interface AuthProviderProps {
  children: JSX.Element
}

export const useUserQuery = () => {
  const data = createAsync(() => userQuery())

  const refetch = () => {
    console.log('refetching user')
    revalidate(userQuery.key)
  }

  return {
    data,
    refetch,
  }
}

export function AuthProvider(props: AuthProviderProps) {
  const userQuery = useUserQuery()
  const signInSubmission = useSubmission(signInAction)
  const _signInAction = useAction(signInAction)
  const signOutSubmission = useSubmission(signOutAction)
  const _signOutAction = useAction(signOutAction)
  const changePassword = useAction(changePasswordAction)
  const changePasswordSubmission = useSubmission(changePasswordAction)
  const resetPassword = useAction(resetPasswordAction)
  const resetPasswordSubmission = useSubmission(resetPasswordAction)
  const user = createMemo(() => userQuery.data())
  const signInError = createMemo(() => signInSubmission.error)
  const signOutError = createMemo(() => signOutSubmission.error)
  const changePasswordError = createMemo(() => changePasswordSubmission.error)
  const resetPasswordError = createMemo(() => resetPasswordSubmission.error)

  const signInWithPassword = async (email: string, password: string) => {
    await _signInAction({email, password})
    userQuery.refetch()
  }

  const signOut = async () => {
    await _signOutAction()
    userQuery.refetch()
  }

  const loading = createMemo(
    () =>
      signInSubmission.pending ||
      signOutSubmission.pending ||
      Boolean(changePasswordSubmission.pending) ||
      Boolean(resetPasswordSubmission.pending),
  )

  return (
    <AuthContext.Provider
      value={{
        changePassword,
        changePasswordError,
        loading,
        resetPassword,
        resetPasswordError,
        signInError,
        signInWithPassword,
        signOut,
        signOutError,
        user,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
