import {createSignal, createEffect} from 'solid-js'
import {useSupabase} from 'src/use/supabase'
import {useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'

export interface SignInProps {
  email: string
  error: Error | null
  loading: boolean
  onLogin: () => Promise<void>
  onUpdateEmail: (email: string) => void
  onUpdatePassword: (password: string) => void
  password: string
}

export const SignIn = (props: SignInProps) => {
  const handleLogin = async (e: Event) => {
    e.preventDefault()
    await props.onLogin()
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleLogin} class="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={props.email}
            onInput={(e) => props.onUpdateEmail(e.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={props.password}
            onInput={(e) => props.onUpdatePassword(e.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          {props.error && <p class="text-red-500 text-sm">{props.error?.message}</p>}
          <button
            type="submit"
            disabled={props.loading}
            class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {props.loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>
        <div class="mt-4 text-center">
          <a href="/public/sign-up" class="text-blue-500 hover:underline">
            Don't have an account? Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
