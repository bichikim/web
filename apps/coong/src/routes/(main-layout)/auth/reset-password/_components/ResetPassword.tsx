import {createSignal, Show} from 'solid-js'
import {useAuth} from 'src/store/auth'
import {AuthSubmitButton} from '../../_components/AuthSubmitButton'
import {AuthSurface} from '../../_components/AuthSurface'
import {AuthTextField} from '../../_components/AuthTextField'

export const ResetPassword = () => {
  const {resetPassword} = useAuth()
  const [email, setEmail] = createSignal('')
  const [success, setSuccess] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleResetPassword = async (event: Event) => {
    event.preventDefault()
    setSuccess(false)
    setError(null)

    try {
      await resetPassword(email())
      setSuccess(true)
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : '패스워드 재설정 이메일 전송에 실패했습니다.',
      )
    }
  }

  return (
    <AuthSurface title="패스워드 재설정">
      <Show
        when={!success()}
        fallback={
          <div class=":uno: text-center">
            <p class=":uno: mb-4 text-#218a50">이메일로 패스워드 재설정 링크를 전송했습니다.</p>
            <p class=":uno: mb-4 text-3.5 leading-5.5 text-#646972">
              이메일을 확인하고 링크를 클릭하여 새 패스워드를 설정하세요.
            </p>
            <a href="/auth/sign-in" class=":uno: text-#4b5bdc no-underline hover:underline">
              로그인 페이지로 돌아가기
            </a>
          </div>
        }
      >
        <form onSubmit={handleResetPassword} class=":uno: flex flex-col gap-4">
          <AuthTextField
            id="reset-password-email"
            type="email"
            label="이메일 주소"
            placeholder="이메일을 입력하세요"
            value={email()}
            onChange={setEmail}
            required
          />
          <Show when={error()}>
            <p class=":uno: m-0 text-3.5 text-#d13b3b">{error()}</p>
          </Show>
          <AuthSubmitButton>{'재설정 링크 전송'}</AuthSubmitButton>
        </form>
        <div class=":uno: mt-4 text-center">
          <a href="/auth/sign-in" class=":uno: text-#4b5bdc no-underline hover:underline">
            로그인 페이지로 돌아가기
          </a>
        </div>
      </Show>
    </AuthSurface>
  )
}
