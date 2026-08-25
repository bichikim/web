import {createSignal} from 'solid-js'

import {requestAdminMagicLink} from './magic-link'

export interface AdminLoginController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly onSubmit: (origin: string) => Promise<void>
  readonly successMessage: () => string | null
}

export const useAdminLogin = (): AdminLoginController => {
  const [email, setEmail] = createSignal('')
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null)
  const [isSubmitting, setIsSubmitting] = createSignal(false)

  const onSubmit = async (origin: string) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const wasSent = await requestAdminMagicLink({
        email: email(),
        origin,
      })

      if (!wasSent) {
        setErrorMessage('로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      setSuccessMessage('등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.')
    } catch {
      setErrorMessage('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email,
    errorMessage,
    isSubmitting,
    onEmailChange: setEmail,
    onSubmit,
    successMessage,
  }
}
