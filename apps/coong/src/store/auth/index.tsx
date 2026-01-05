import {Accessor, createContext, createMemo, createSignal, useContext, type JSX, Show} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {userQuery} from 'src/requests/user'
import {signInAction} from 'src/requests/sign-in'
import {signOutAction} from 'src/requests/sign-out'
import {changePasswordAction} from 'src/requests/change-password'
import {resetPasswordAction} from 'src/requests/reset-password'
import {useSubmission, useAction, revalidate, createAsync} from '@solidjs/router'
import {withHandyQuery} from 'src/use/handy-query'
import {exchangeCodeForSectionAction} from 'src/requests/exchange-code-for-section'
import {isServer} from 'solid-js/web'

const AuthContext = createContext<{
  changePassword: (newPassword: string) => Promise<User | null>
  changePasswordError: Accessor<Error | null>
  exchangeCodeForSection: (code: string) => Promise<User | null>
  exchangeCodeForSectionError: Accessor<Error | null>
  loading: Accessor<boolean>
  resetPassword: (email: string) => Promise<void>
  resetPasswordError: Accessor<Error | null>
  restoreLoading: Accessor<boolean>
  signInError: Accessor<Error | null>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signOutError: Accessor<Error | null>
  user: Accessor<User | null>
}>({
  changePassword: () => Promise.resolve(null),
  changePasswordError: () => null,
  exchangeCodeForSection: () => Promise.resolve(null),
  exchangeCodeForSectionError: () => null,
  loading: () => false,
  resetPassword: () => Promise.resolve(),
  resetPasswordError: () => null,
  restoreLoading: () => false,
  signInError: () => null,
  signInWithPassword: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  signOutError: () => null,
  user: () => null,
})

export interface AuthProviderProps {
  children: JSX.Element
}

export const useUserQuery = withHandyQuery(userQuery)

export function AuthProvider(props: AuthProviderProps) {
  const userQuery = useUserQuery({initialValue: null})
  const signInSubmission = useSubmission(signInAction)
  const signInActionSubmit = useAction(signInAction)
  const signOutSubmission = useSubmission(signOutAction)
  const signOutActionSubmit = useAction(signOutAction)
  const exchangeCodeForSectionSubmit = useAction(exchangeCodeForSectionAction)
  const exchangeCodeForSectionSubmission = useSubmission(exchangeCodeForSectionAction)
  const changePassword = useAction(changePasswordAction)
  const changePasswordSubmission = useSubmission(changePasswordAction)
  const resetPassword = useAction(resetPasswordAction)
  const resetPasswordSubmission = useSubmission(resetPasswordAction)
  const user = createMemo(() => userQuery.data())
  const signInError = createMemo(() => signInSubmission.error)
  const signOutError = createMemo(() => signOutSubmission.error)
  const changePasswordError = createMemo(() => changePasswordSubmission.error)
  const resetPasswordError = createMemo(() => resetPasswordSubmission.error)
  const exchangeCodeForSectionError = createMemo(() => exchangeCodeForSectionSubmission.error)

  const signInWithPassword = async (email: string, password: string) => {
    await signInActionSubmit({email, password})
    await userQuery.refetch()
  }

  const signOut = async () => {
    await signOutActionSubmit()
    await userQuery.refetch()
  }

  const _exchangeCodeForSection = async (code: string) => {
    const data = await exchangeCodeForSectionSubmit(code)

    await userQuery.refetch()

    return data
  }

  const loading = createMemo(
    () =>
      userQuery.loading() ||
      signInSubmission.pending ||
      signOutSubmission.pending ||
      Boolean(changePasswordSubmission.pending) ||
      Boolean(resetPasswordSubmission.pending) ||
      Boolean(exchangeCodeForSectionSubmission.pending),
  )

  return (
    <AuthContext.Provider
      value={{
        changePassword,
        changePasswordError,
        exchangeCodeForSection: _exchangeCodeForSection,
        exchangeCodeForSectionError,
        loading,
        resetPassword,
        resetPasswordError,
        restoreLoading: userQuery.loading,
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
