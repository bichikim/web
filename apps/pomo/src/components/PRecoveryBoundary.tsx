import {type Accessor, ErrorBoundary, type JSX, Show} from 'solid-js'

import {PButton, pButtonClasses} from './PButton'
import * as m from '@paraglide/message'
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
              <Show when={!props.canRetry()}>
                <p class="mt-4 text-sm text-muted-foreground">{m.recovery_stopped()}</p>
              </Show>
              <div class="mt-5 flex flex-wrap justify-center gap-3">
                <Show when={props.canRetry()}>
                  <PButton onPress={() => props.onRetry(reset)}>{m.recovery_retry()}</PButton>
                </Show>
                <PButton onPress={props.onReload} tone="secondary">
                  {m.recovery_reload()}
                </PButton>
                <a class={pButtonClasses({tone: 'secondary'})} href="/" target="_self">
                  {m.recovery_home()}
                </a>
              </div>
            </section>
          </main>
        )
      }}
    >
      <RecoveryAttempt onReady={props.onReady}>{props.children}</RecoveryAttempt>
    </ErrorBoundary>
  )
}
