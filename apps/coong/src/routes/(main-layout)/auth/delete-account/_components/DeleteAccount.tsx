import {createMemo, createSignal, Show} from 'solid-js'
import {A, useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {AuthSubmitButton} from '../../_components/AuthSubmitButton'
import {AuthSurface} from '../../_components/AuthSurface'
import {AuthTextField} from '../../_components/AuthTextField'

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
    <AuthSurface
      title="회원 탈퇴"
      titleClass="text-#d13b3b"
      footer={
        <div class=":uno: mt-4 text-center">
          <A href="/" class=":uno: text-#4b5bdc no-underline hover:underline">
            홈으로 돌아가기
          </A>
        </div>
      }
    >
      <div class=":uno: mb-4 rounded-2 border border-#d13b3b/20 bg-#fff4f4 p-3 text-3.5 text-#b92f2f">
        <p class=":uno: mb-2 mt-0 font-800">탈퇴 시 주의사항</p>
        <ul class=":uno: m-0 list-inside list-disc space-y-1 pl-0">
          <li>계정과 연결된 모든 데이터가 비활성화됩니다.</li>
          <li>저장된 음악과 설정에 더 이상 접근할 수 없습니다.</li>
          <li>이 작업은 되돌릴 수 없습니다.</li>
        </ul>
      </div>
      <form onSubmit={handleDelete} class=":uno: flex flex-col gap-4">
        <AuthTextField
          id="account-email"
          type="email"
          label="이메일"
          value={email()}
          readOnly
          disabled
        />
        <AuthTextField
          id="confirm-text"
          type="text"
          label={
            <>
              계속하시려면 <span class=":uno: font-900 text-#d13b3b">{CONFIRM_PHRASE}</span> 문구를
              입력하세요.
            </>
          }
          placeholder={CONFIRM_PHRASE}
          value={confirmText()}
          onChange={setConfirmText}
          autocomplete="off"
          required
        />
        <Show when={error()}>
          <p class=":uno: m-0 text-3.5 text-#d13b3b">{error()}</p>
        </Show>
        <AuthSubmitButton disabled={!canSubmit()}>
          {pending() ? '탈퇴 처리 중...' : '회원 탈퇴'}
        </AuthSubmitButton>
      </form>
    </AuthSurface>
  )
}
