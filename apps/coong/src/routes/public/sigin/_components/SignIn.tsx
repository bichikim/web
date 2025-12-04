import {createSignal} from 'solid-js'
import {useSupabase} from 'src/use/supabase'
import {useNavigate} from '@solidjs/router'

export const SignIn = () => {
  const supabase = useSupabase()
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleLogin = async (e: Event) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {error} = await supabase.auth.signInWithPassword({
      email: email(),
      password: password(),
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleLogin} class="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          {error() && <p class="text-red-500 text-sm">{error()}</p>}
          <button
            type="submit"
            disabled={loading()}
            class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading() ? 'Loading...' : 'Sign In'}
          </button>
        </form>
        <div class="mt-4 text-center">
          <a href="/signup" class="text-blue-500 hover:underline">
            Don't have an account? Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
