import {createMemo, createSignal, Show} from 'solid-js'
import {A, useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'

const CONFIRM_PHRASE = '회원 탈퇴'

export const DeleteAccount = () => {
  const {deleteAccount, user} = useAuth()
  const navigate = useNavigate()

  const [confirmText, setConfirmText] = createSignal('')
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const email = createMemo(() => user()?.email ?? '')
  const canSubmit = createMemo(() => confirmText().trim() === CONFIRM_PHRASE && !pending())

  const handleDelete = async (event: Event) => {
    event.preventDefault()
    if (!canSubmit()) {
      return
    }

    setError(null)
    setPending(true)

    try {
      await deleteAccount()
      navigate('/', {replace: true})
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : '회원 탈퇴 처리에 실패했습니다.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center text-red-600">회원 탈퇴</h1>
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <p class="font-medium mb-2">탈퇴 시 주의사항</p>
          <ul class="list-disc list-inside space-y-1">
            <li>계정과 연결된 모든 데이터가 비활성화됩니다.</li>
            <li>저장된 음악과 설정에 더 이상 접근할 수 없습니다.</li>
            <li>이 작업은 되돌릴 수 없습니다.</li>
          </ul>
        </div>
        <form onSubmit={handleDelete} class="flex flex-col gap-4">
          <div>
            <label for="account-email" class="block text-sm font-medium mb-1">
              이메일
            </label>
            <input
              id="account-email"
              type="email"
              value={email()}
              class="w-full p-2 border rounded bg-gray-100 text-gray-600"
              readOnly
              disabled
            />
          </div>
          <div>
            <label for="confirm-text" class="block text-sm font-medium mb-1">
              계속하시려면 <span class="font-bold text-red-600">{CONFIRM_PHRASE}</span>{' '}
              문구를 입력하세요.
            </label>
            <input
              id="confirm-text"
              type="text"
              placeholder={CONFIRM_PHRASE}
              value={confirmText()}
              onInput={(event) => setConfirmText(event.currentTarget.value)}
              class="w-full p-2 border rounded"
              autocomplete="off"
              required
            />
          </div>
          <Show when={error()}>
            <p class="text-red-500 text-sm">{error()}</p>
          </Show>
          <button
            type="submit"
            disabled={!canSubmit()}
            class="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {pending() ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
        </form>
        <div class="mt-4 text-center">
          <A href="/" class="text-blue-500 hover:underline">
            홈으로 돌아가기
          </A>
        </div>
      </div>
    </div>
  )
}
