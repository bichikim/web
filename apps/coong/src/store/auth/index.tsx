import {Accessor, createContext, createMemo, useContext, type JSX} from 'solid-js'
import type {User} from '@supabase/supabase-js'
import {useUser} from 'src/requests/user'
import {useSignIn} from 'src/requests/sign-in'
import {useSignOut} from 'src/requests/sign-out'

const AuthContext = createContext<{
  loading: Accessor<boolean>
  signInError: Accessor<Error | null>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signOutError: Accessor<Error | null>
  user: Accessor<User | null>
}>({
  loading: () => false,
  signInError: () => null,
  signInWithPassword: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  signOutError: () => null,
  user: () => null,
})

export interface AuthProviderProps {
  children: JSX.Element
}

export function AuthProvider(props: AuthProviderProps) {
  const userQuery = useUser()
  const signInMutation = useSignIn()
  const signOutMutation = useSignOut()
  const user = createMemo(() => userQuery.data)
  const signInError = createMemo(() => signInMutation.error)
  const signOutError = createMemo(() => signOutMutation.error)

  const signInWithPassword = async (email: string, password: string) => {
    await signInMutation.mutateAsync({email, password})
    userQuery.refetch()
  }

  const signOut = async () => {
    await signOutMutation.mutateAsync()
    userQuery.refetch()
  }

  const loading = createMemo(() => signInMutation.isPending || signOutMutation.isPending)

  return (
    <AuthContext.Provider value={{loading, signInError, signInWithPassword, signOut, signOutError, user}}>
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
