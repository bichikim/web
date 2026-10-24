import {createSignal, Show} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {AuthSubmitButton} from '../../_components/AuthSubmitButton'
import {AuthSurface} from '../../_components/AuthSurface'
import {AuthTextField} from '../../_components/AuthTextField'

const passwordVisibilityButtonClass = `:uno:
absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center
rounded-2 border-0 bg-transparent text-#6f7682 outline-none hover:bg-black/5 hover:text-#101114
focus-visible:ring-2 focus-visible:ring-#111216/16
`

export const ChangePassword = () => {
  const navigate = useNavigate()
  const {changePassword} = useAuth()
  const [newPassword, setNewPassword] = createSignal('')
  const [confirmPassword, setConfirmPassword] = createSignal('')
  const [showNewPassword, setShowNewPassword] = createSignal(false)
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)

  const handleChangePassword = async (event: Event) => {
    event.preventDefault()
    setError(null)

    const newPwd = newPassword()
    const confirmPwd = confirmPassword()

    if (newPwd !== confirmPwd) {
      setError('패스워드가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      await changePassword(newPwd)
      navigate('/')
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : '패스워드 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSurface
      title="패스워드 변경"
      footer={
        <div class=":uno: mt-4 text-center">
          <a href="/" class=":uno: text-#4b5bdc no-underline hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      }
    >
      <form onSubmit={handleChangePassword} class=":uno: flex flex-col gap-4">
        <AuthTextField
          id="new-password"
          type={showNewPassword() ? 'text' : 'password'}
          label="새 패스워드"
          placeholder="새 패스워드를 입력하세요"
          value={newPassword()}
          onChange={setNewPassword}
          required
          minLength={6}
          trailing={
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword())}
              class={passwordVisibilityButtonClass}
              aria-label={showNewPassword() ? '패스워드 숨기기' : '패스워드 표시하기'}
            >
              <span
                class={`:uno: h-5 w-5 ${showNewPassword() ? 'i-tabler:eye-off' : 'i-tabler:eye'}`}
              />
            </button>
          }
        />
        <AuthTextField
          id="confirm-password"
          type={showConfirmPassword() ? 'text' : 'password'}
          label="패스워드 확인"
          placeholder="새 패스워드를 다시 입력하세요"
          value={confirmPassword()}
          onChange={setConfirmPassword}
          required
          minLength={6}
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword())}
              class={passwordVisibilityButtonClass}
              aria-label={showConfirmPassword() ? '패스워드 숨기기' : '패스워드 표시하기'}
            >
              <span
                class={`:uno: h-5 w-5 ${showConfirmPassword() ? 'i-tabler:eye-off' : 'i-tabler:eye'}`}
              />
            </button>
          }
        />
        <Show when={error()}>
          <p class=":uno: m-0 text-3.5 text-#d13b3b">{error()}</p>
        </Show>
        <AuthSubmitButton disabled={loading()}>
          {loading() ? '변경 중...' : '패스워드 변경'}
        </AuthSubmitButton>
      </form>
    </AuthSurface>
  )
}
