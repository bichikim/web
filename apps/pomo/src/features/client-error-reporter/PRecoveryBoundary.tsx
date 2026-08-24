import {ErrorBoundary, type JSX, onMount, Show} from 'solid-js'
import {isServer} from 'solid-js/web'

import {PButton} from '../../design-system/PButton'
import {createClientErrorId, reportClientError} from './reporter'

export interface PRecoveryBoundaryProps {
  readonly children?: JSX.Element
  readonly onReload?: () => void
  readonly reportError?: (error: unknown) => string
}

interface RecoveryAttemptProps {
  readonly children?: JSX.Element
  readonly onReady: () => void
}

const RecoveryAttempt = (props: RecoveryAttemptProps) => {
  onMount(() => props.onReady())
  return <>{props.children}</>
}

const getRecoveryErrorId = (error: unknown, reportError?: (error: unknown) => string) => {
  if (isServer) {
    return createClientErrorId()
  }

  try {
    return (
      reportError?.(error) ??
      reportClientError(error, {feature: 'application', source: 'error-boundary'})
    )
  } catch {
    return createClientErrorId()
  }
}

export const PRecoveryBoundary = (props: PRecoveryBoundaryProps) => {
  let retryCount = 0

  const reload = () => {
    if (props.onReload !== undefined) {
      props.onReload()
      return
    }

    window.location.reload()
  }

  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        const errorId = getRecoveryErrorId(error, props.reportError)
        const canRetry = retryCount === 0
        const retry = () => {
          retryCount += 1
          reset()
        }

        return (
          <main class="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
            <section class="max-w-md text-center" role="alert">
              <h1 class="text-2xl font-700">Pomofi를 불러오지 못했어요</h1>
              <p class="mt-3 opacity-70">
                잠시 후 다시 시도하거나, 계속 문제가 생기면 앱을 새로고침해 주세요.
              </p>
              <p class="mt-3 text-sm opacity-70">
                오류 ID: <code>{errorId}</code>
              </p>
              <Show
                fallback={
                  <p class="mt-4 text-sm text-muted-foreground">
                    다시 오류가 발생해 자동 복구를 중단했어요. 새로고침해 주세요.
                  </p>
                }
                when={canRetry}
              >
                <PButton class="mt-5" onPress={retry}>
                  다시 시도
                </PButton>
              </Show>
              <PButton class="mt-3" onPress={reload} tone="secondary">
                새로고침
              </PButton>
            </section>
          </main>
        )
      }}
    >
      <RecoveryAttempt onReady={() => (retryCount = 0)}>{props.children}</RecoveryAttempt>
    </ErrorBoundary>
  )
}
