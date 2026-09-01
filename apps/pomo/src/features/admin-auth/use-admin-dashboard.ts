import {useNavigate, useSubmission} from '@solidjs/router'
import {createEffect, createMemo} from 'solid-js'

import {signOutAdminSessionAction} from '../auth/actions'

export interface AdminDashboardController {
  readonly errorMessage: () => string | null
  readonly isSigningOut: () => boolean
}

export const useAdminDashboard = (): AdminDashboardController => {
  const navigate = useNavigate()
  const submission = useSubmission(signOutAdminSessionAction)
  const errorMessage = createMemo(() => {
    const status = submission.result?.status

    return status === 'rejected' || status === 'unavailable'
      ? '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : null
  })

  createEffect(() => {
    if (submission.result?.status === 'signed-out') {
      navigate('/admin/login', {replace: true})
    }
  })

  return {
    errorMessage,
    isSigningOut: () => submission.pending === true,
  }
}
