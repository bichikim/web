import {createSignal, Show} from 'solid-js'
import {useAuth} from 'src/store/auth'
import {useNameNavigate} from 'src/components/anchor/nameNavigate'

export const ChangePassword = () => {
  const navigate = useNameNavigate()
  const {changePassword, changePasswordError, loading} = useAuth()
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [showNewPassword, setShowNewPassword] = createSignal(false)
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleChangePassword = async (e: Event) => {
    e.preventDefault()
    setError(null)

    const newPwd = newPassword()
    const confirmPwd = confirmPassword()

    try {
      const result = await changePassword(newPwd)

      navigate('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : '패스워드 변경에 실패했습니다.')
    }
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">패스워드 변경</h1>
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
          <a href="/" class="text-blue-500 hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}
