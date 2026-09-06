import {createSignal, Match, Switch} from 'solid-js'

import {PButton} from './PButton'
import {checkSystemHealth, type SystemHealthResult} from '../features/system-health'
import * as m from '@paraglide/message'

const FAILED_RESULT = {
  api: 'unhealthy',
  serverFunction: 'unhealthy',
} as const satisfies SystemHealthResult

export const PHealthCheck = () => {
  const [isChecking, setIsChecking] = createSignal(false)
  const [result, setResult] = createSignal<SystemHealthResult | null>(null)

  const handleCheck = async () => {
    setIsChecking(true)
    setResult(null)

    try {
      setResult(await checkSystemHealth())
    } catch {
      setResult(FAILED_RESULT)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <section
      aria-label={m.settings_health_title()}
      class="grid gap-2 border-t border-solid border-border pt-5"
    >
      <div class="flex flex-wrap items-center gap-2.5">
        <PButton disabled={isChecking()} onPress={handleCheck} size="small" tone="secondary">
          {m.settings_health_action()}
        </PButton>
        <p
          aria-live="polite"
          class="m-0 flex flex-wrap gap-x-3 gap-y-1 text-modal-detail text-muted-foreground"
          role="status"
        >
          <Switch fallback={<span>{m.settings_health_idle()}</span>}>
            <Match when={isChecking()}>{m.settings_health_checking()}</Match>
            <Match when={result()}>
              {(health) => (
                <>
                  <span>
                    {health().api === 'healthy'
                      ? m.settings_health_api_success()
                      : m.settings_health_api_failure()}
                  </span>
                  <span>
                    {health().serverFunction === 'healthy'
                      ? m.settings_health_server_success()
                      : m.settings_health_server_failure()}
                  </span>
                </>
              )}
            </Match>
          </Switch>
        </p>
      </div>
    </section>
  )
}
