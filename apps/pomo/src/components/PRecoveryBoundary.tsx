import {type Accessor, ErrorBoundary, type JSX, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import {RecoveryAttempt} from './recovery-boundary/Attempt'

export interface PRecoveryBoundaryProps {
  readonly canRetry: Accessor<boolean>
  readonly children?: JSX.Element
  readonly onError: (error: unknown) => string
  readonly onReady: () => void
  readonly onReload: () => void
  readonly onRetry: (reset: () => void) => void
}

export const PRecoveryBoundary = (props: PRecoveryBoundaryProps) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        const errorId = props.onError(error)

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
                when={props.canRetry()}
              >
                <PButton class="mt-5" onPress={() => props.onRetry(reset)}>
                  다시 시도
                </PButton>
              </Show>
              <PButton class="mt-3" onPress={props.onReload} tone="secondary">
                새로고침
              </PButton>
            </section>
          </main>
        )
      }}
    >
      <RecoveryAttempt onReady={props.onReady}>{props.children}</RecoveryAttempt>
    </ErrorBoundary>
  )
}
