import {useSubmission} from '@solidjs/router'
import {createMemo, createSignal} from 'solid-js'

import {requestAdminMagicLinkAction} from '../auth/actions'

export interface AdminLoginController {
  readonly email: () => string
  readonly errorMessage: () => string | null
  readonly isSubmitting: () => boolean
  readonly onEmailChange: (email: string) => void
  readonly successMessage: () => string | null
}

export const useAdminLogin = (): AdminLoginController => {
  const [email, setEmail] = createSignal('')
  const submission = useSubmission(requestAdminMagicLinkAction)
  const errorMessage = createMemo(() => {
    const status = submission.result?.status

    if (status === 'rejected') {
      return '로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }

    return status === 'unavailable'
      ? '로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : null
  })
  const successMessage = createMemo(() =>
    submission.result?.status === 'sent'
      ? '등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.'
      : null,
  )

  return {
    email,
    errorMessage,
    isSubmitting: () => submission.pending === true,
    onEmailChange: setEmail,
    successMessage,
  }
}
