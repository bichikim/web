import {createSignal, Show} from 'solid-js'
import {useAuth} from 'src/store/auth'

export const ResetPassword = () => {
  const {resetPassword} = useAuth()
  const [email, setEmail] = createSignal('')
  const [success, setSuccess] = createSignal(false)

  const handleResetPassword = async (event: Event) => {
    event.preventDefault()
    setSuccess(false)

    try {
      await resetPassword(email())
      setSuccess(true)
    } catch {
      // Error is handled by resetPasswordError
    }
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">패스워드 재설정</h1>
        <Show
          when={!success()}
          fallback={
            <div class="text-center">
              <p class="text-green-600 mb-4">이메일로 패스워드 재설정 링크를 전송했습니다.</p>
              <p class="text-sm text-gray-600 mb-4">
                이메일을 확인하고 링크를 클릭하여 새 패스워드를 설정하세요.
              </p>
              <a href="/public/sign-in" class="text-blue-500 hover:underline">
                로그인 페이지로 돌아가기
              </a>
            </div>
          }
        >
          <form onSubmit={handleResetPassword} class="flex flex-col gap-4">
            <div>
              <label for="email" class="block text-sm font-medium mb-1">
                이메일 주소
              </label>
              <input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email()}
                onInput={(event) => setEmail(event.currentTarget.value)}
                class="w-full p-2 border rounded"
                required
              />
            </div>
            <Show when={null}>
              <p class="text-red-500 text-sm">null</p>
            </Show>
            <button
              type="submit"
              disabled={false}
              class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {'재설정 링크 전송'}
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
