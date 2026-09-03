import {apiFetch} from 'src/features/http-client'
import {checkServerHealth} from 'src/server/functions/health'

import {type HealthTargetStatus, isHealthProbe, type SystemHealthResult} from './contract'

const REQUEST_TIMEOUT_MILLISECONDS = 10_000

const checkApiHealth = async (): Promise<boolean> => {
  const response = await apiFetch('health', {
    cache: 'no-store',
    method: 'GET',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  })

  if (!response.ok) {
    return false
  }

  return isHealthProbe(await response.json())
}

const getRequestStatus = (result: PromiseSettledResult<boolean>): HealthTargetStatus =>
  result.status === 'fulfilled' && result.value ? 'healthy' : 'unhealthy'

const checkServerFunctionHealth = async (): Promise<boolean> =>
  isHealthProbe(await checkServerHealth())

const settleWithinTimeout = async (request: Promise<boolean>): Promise<boolean> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<boolean>((resolve) => {
    timeoutId = setTimeout(() => resolve(false), REQUEST_TIMEOUT_MILLISECONDS)
  })

  try {
    return await Promise.race([request, timeout])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}

/** Checks the public API and remote server-function transports independently. */
export const checkSystemHealth = async (): Promise<SystemHealthResult> => {
  const [apiResult, serverFunctionResult] = await Promise.allSettled([
    settleWithinTimeout(checkApiHealth()),
    settleWithinTimeout(checkServerFunctionHealth()),
  ])

  return {
    api: getRequestStatus(apiResult),
    serverFunction: getRequestStatus(serverFunctionResult),
  }
}
