import {createSignal, Show, onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {useSupabase} from 'src/use/supabase'

export const ChangePassword = () => {
  const navigate = useNavigate()
  const supabase = useSupabase()
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [showNewPassword, setShowNewPassword] = createSignal(false)
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [isInitialized, setIsInitialized] = createSignal(false)

  onMount(async () => {
    // Check for hash fragment in URL (Supabase sends access_token in hash)
    const hash = window.location.hash

    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      if (accessToken && type === 'recovery') {
        try {
          // Set the session using the access token from the hash
          const {data, error: sessionError} = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })

          if (sessionError) {
            setError('세션 설정에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.')

            return
          }

          setIsInitialized(true)
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
        } catch (err) {
          setError('토큰 처리 중 오류가 발생했습니다.')
        }
      } else {
        setError('유효하지 않은 재설정 링크입니다.')
      }
    } else {
      // Check if user is already authenticated (for direct access)
      const {
        data: {session},
      } = await supabase.auth.getSession()

      if (session) {
        setIsInitialized(true)
      } else {
        setError('재설정 링크가 필요합니다.')
      }
    }
  })

  const handleChangePassword = async (e: Event) => {
    e.preventDefault()
    setError(null)

    const newPwd = newPassword()
    const confirmPwd = confirmPassword()

    if (newPwd !== confirmPwd) {
      setError('패스워드가 일치하지 않습니다.')

      return
    }

    if (newPwd.length < 6) {
      setError('패스워드는 최소 6자 이상이어야 합니다.')

      return
    }

    setLoading(true)

    try {
      const {data, error: updateError} = await supabase.auth.updateUser({
        password: newPwd,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)

        return
      }

      // Success - redirect to sign in
      navigate('/public/sign-in', {replace: true})
    } catch (err) {
      setError(err instanceof Error ? err.message : '패스워드 변경에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">패스워드 변경</h1>
        <Show
          when={isInitialized()}
          fallback={
            <div class="text-center">
              <p class="text-gray-600 mb-4">링크를 확인하는 중...</p>
              <Show when={error()}>
                <p class="text-red-500 text-sm mb-4">{error()}</p>
                <a href="/public/reset-password" class="text-blue-500 hover:underline">
                  새로운 재설정 링크 요청하기
                </a>
              </Show>
            </div>
          }
        >
          <form onSubmit={handleChangePassword} class="flex flex-col gap-4">
            <div>
              <label for="new-password" class="block text-sm font-medium mb-1">
                새 패스워드
              </label>
              <div class="relative">
                <input
                  id="new-password"
                  type={showNewPassword() ? 'text' : 'password'}
                  placeholder="새 패스워드를 입력하세요"
                  value={newPassword()}
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  class="w-full p-2 pr-10 border rounded"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword())}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showNewPassword() ? '패스워드 숨기기' : '패스워드 표시하기'}
                >
                  <span class={`text-xl ${showNewPassword() ? 'i-tabler:eye-off' : 'i-tabler:eye'}`} />
                </button>
              </div>
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-medium mb-1">
                패스워드 확인
              </label>
              <div class="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword() ? 'text' : 'password'}
                  placeholder="새 패스워드를 다시 입력하세요"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                  class="w-full p-2 pr-10 border rounded"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showConfirmPassword() ? '패스워드 숨기기' : '패스워드 표시하기'}
                >
                  <span class={`text-xl ${showConfirmPassword() ? 'i-tabler:eye-off' : 'i-tabler:eye'}`} />
                </button>
              </div>
            </div>
            <Show when={error()}>
              <p class="text-red-500 text-sm">{error()}</p>
            </Show>
            <button
              type="submit"
              disabled={loading()}
              class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading() ? '변경 중...' : '패스워드 변경'}
            </button>
          </form>
          <div class="mt-4 text-center">
            <a href="/public/sign-in" class="text-blue-500 hover:underline">
              로그인 페이지로 돌아가기
            </a>
          </div>
        </Show>
      </div>
    </div>
  )
}
