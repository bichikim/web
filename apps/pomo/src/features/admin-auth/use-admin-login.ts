import {useSubmission} from '@solidjs/router'
import {createEffect, createMemo, createSignal} from 'solid-js'

import {type MagicLinkActionResult, requestAdminMagicLinkAction} from '../auth/actions'

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
  const [feedbackStatus, setFeedbackStatus] = createSignal<MagicLinkActionResult['status'] | null>(
    null,
  )
  const errorMessage = createMemo(() => {
    const status = feedbackStatus()

    if (status === 'rejected') {
      return '로그인 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }

    return status === 'unavailable'
      ? '로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : null
  })
  const successMessage = createMemo(() =>
    feedbackStatus() === 'sent'
      ? '등록된 관리자 계정이라면 로그인 링크를 이메일로 보냈습니다.'
      : null,
  )

  createEffect(() => {
    if (submission.pending === true) {
      setFeedbackStatus(null)
      return
    }

    const {result} = submission

    if (result === undefined) {
      return
    }

    setFeedbackStatus(result.status)
    submission.clear()
  })

  return {
    email,
    errorMessage,
    isSubmitting: () => submission.pending === true,
    onEmailChange: setEmail,
    successMessage,
  }
}
