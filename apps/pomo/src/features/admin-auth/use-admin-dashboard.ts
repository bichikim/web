import {useNavigate, useSubmission} from '@solidjs/router'
import {createEffect, createMemo, createSignal} from 'solid-js'

import {type SignOutActionResult, signOutAdminSessionAction} from '../auth/actions'

export interface AdminDashboardController {
  readonly errorMessage: () => string | null
  readonly isSigningOut: () => boolean
}

export const useAdminDashboard = (): AdminDashboardController => {
  const navigate = useNavigate()
  const submission = useSubmission(signOutAdminSessionAction)
  const [feedbackStatus, setFeedbackStatus] = createSignal<SignOutActionResult['status'] | null>(
    null,
  )
  const errorMessage = createMemo(() => {
    const status = feedbackStatus()

    return status === 'rejected' || status === 'unavailable'
      ? '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : null
  })

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

    if (result.status !== 'signed-out') {
      return
    }

    navigate('/admin/login', {replace: true})
  })

  return {
    errorMessage,
    isSigningOut: () => submission.pending === true,
  }
}
