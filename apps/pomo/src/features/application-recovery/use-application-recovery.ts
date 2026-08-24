import {type Accessor, createSignal} from 'solid-js'
import {isServer} from 'solid-js/web'

import {createClientErrorId, reportClientError} from '../client-error-reporter'

export interface ApplicationRecoveryController {
  readonly canRetry: Accessor<boolean>
  readonly onError: (error: unknown) => string
  readonly onReady: () => void
  readonly onReload: () => void
  readonly onRetry: (reset: () => void) => void
}

export interface UseApplicationRecoveryProps {
  readonly createErrorId?: () => string
  readonly onReload?: () => void
  readonly reportError?: (error: unknown) => string
}

/** Connects application recovery events to client diagnostics and browser reload. */
export const useApplicationRecovery = (
  props: UseApplicationRecoveryProps = {},
): ApplicationRecoveryController => {
  const [canRetry, setCanRetry] = createSignal(true)
  const createErrorId = () => (props.createErrorId ?? createClientErrorId)()

  const onError = (error: unknown) => {
    if (isServer) {
      return createErrorId()
    }

    try {
      return (
        props.reportError?.(error) ??
        reportClientError(error, {feature: 'application', source: 'error-boundary'})
      )
    } catch {
      return createErrorId()
    }
  }

  const onReload = () => {
    if (props.onReload !== undefined) {
      props.onReload()
      return
    }

    window.location.reload()
  }

  const onReady = () => setCanRetry(true)
  const onRetry = (reset: () => void) => {
    if (!canRetry()) {
      return
    }

    setCanRetry(false)
    reset()
  }

  return {canRetry, onError, onReady, onReload, onRetry}
}
