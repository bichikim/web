import {action} from '@solidjs/router'

import {
  createTossLoginSession,
  readStoredAppSession,
  requestAccountLinkEmail,
  revokeTossLoginSession,
} from './app-session'
import {completeAccountLink} from './web-session'

type FormValues = FormData | URLSearchParams

export type CompleteAccountLinkActionResult =
  | {readonly status: 'invalid'}
  | {readonly status: 'linked'}
  | {readonly status: 'unavailable'}

export type TossLoginActionResult =
  | {readonly status: 'authenticated'}
  | {readonly status: 'unavailable'}

export type TossLogoutActionResult =
  | {readonly status: 'cleanup-pending'}
  | {readonly status: 'signed-out'}
  | {readonly status: 'unavailable'}

export type AccountLinkEmailActionResult =
  | {readonly status: 'not-sent'}
  | {readonly retryAfterSeconds: number | null; readonly status: 'rate-limited'}
  | {readonly status: 'sent'}
  | {readonly status: 'unavailable'}

const runCompleteAccountLink = async (token: string): Promise<CompleteAccountLinkActionResult> => {
  try {
    const result = await completeAccountLink(token)
    return {status: result}
  } catch {
    return {status: 'unavailable'}
  }
}

const runTossLogin = async (): Promise<TossLoginActionResult> => {
  try {
    await createTossLoginSession()
    return {status: 'authenticated'}
  } catch {
    return {status: 'unavailable'}
  }
}

const runTossLogout = async (): Promise<TossLogoutActionResult> => {
  try {
    const token = await readStoredAppSession()
    if (token === null) {
      return {status: 'signed-out'}
    }

    const result = await revokeTossLoginSession(token)
    return {
      status: result.storageStatus === 'cleared' ? 'signed-out' : 'cleanup-pending',
    }
  } catch {
    return {status: 'unavailable'}
  }
}

const runRequestAccountLinkEmail = async (
  values: FormValues,
): Promise<AccountLinkEmailActionResult> => {
  const email = values.get('email')?.toString().trim() ?? ''

  if (email.length === 0) {
    return {status: 'not-sent'}
  }

  try {
    const token = await readStoredAppSession()
    if (token === null) {
      return {status: 'unavailable'}
    }

    return await requestAccountLinkEmail(token, email)
  } catch {
    return {status: 'unavailable'}
  }
}

export const completeAccountLinkAction = action(
  runCompleteAccountLink,
  'complete-user-account-link',
)
export const createTossLoginSessionAction = action(runTossLogin, 'create-toss-login-session')
export const revokeTossLoginSessionAction = action(runTossLogout, 'revoke-toss-login-session')
export const requestAccountLinkEmailAction = action(
  runRequestAccountLinkEmail,
  'request-toss-account-link-email',
)
