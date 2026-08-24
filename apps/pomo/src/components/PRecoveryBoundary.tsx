import {type Accessor, ErrorBoundary, type JSX, Show} from 'solid-js'

import {PButton} from '../design-system/PButton'
import * as m from '../paraglide/messages.js'
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
              <h1 class="text-2xl font-700">{m.app_load_error()}</h1>
              <p class="mt-3 opacity-70">{m.recovery_description()}</p>
              <p class="mt-3 text-sm opacity-70">
                {m.recovery_error_id()} <code>{errorId}</code>
              </p>
              <Show
                fallback={<p class="mt-4 text-sm text-muted-foreground">{m.recovery_stopped()}</p>}
                when={props.canRetry()}
              >
                <PButton class="mt-5" onPress={() => props.onRetry(reset)}>
                  {m.recovery_retry()}
                </PButton>
              </Show>
              <PButton class="mt-3" onPress={props.onReload} tone="secondary">
                {m.recovery_reload()}
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
