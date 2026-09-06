import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {type CalendarConnection} from '../../features/calendar'
import {PButton} from '../PButton'

const PROVIDER_LABELS = {
  google: 'Google Calendar',
  microsoft: 'Microsoft Outlook',
} as const

interface CalendarProviderActionsProps {
  readonly connections: ReadonlyArray<CalendarConnection>
  readonly confirmingId: string | null
  readonly onConnect: (provider: CalendarConnection['provider']) => void
  readonly onDisconnect: (connection: CalendarConnection) => void
  readonly pending: boolean
  readonly provider: CalendarConnection['provider']
}

export const CalendarProviderActions = (props: CalendarProviderActionsProps) => {
  const providerConnections = () =>
    props.connections.filter((connection) => connection.provider === props.provider)
  return (
    <Show
      when={providerConnections().length > 0}
      fallback={
        <PButton
          class="w-full"
          disabled={props.pending}
          onPress={() => props.onConnect(props.provider)}
          tone="secondary"
        >
          {props.provider === 'google'
            ? m.calendar_connect_google()
            : m.calendar_connect_microsoft()}
        </PButton>
      }
    >
      <For each={providerConnections()}>
        {(connection) => (
          <div class="grid gap-1.5">
            <PButton
              accessibleLabel={m.calendar_disconnect({account: connection.accountLabel})}
              class="w-full"
              disabled={props.pending}
              onPress={() => props.onDisconnect(connection)}
              tone={props.confirmingId === connection.id ? 'danger' : 'secondary'}
            >
              <span class="grid gap-1 text-center leading-tight">
                <span>
                  {props.confirmingId === connection.id
                    ? m.calendar_disconnect_confirm()
                    : m.calendar_disconnect_provider({
                        provider: PROVIDER_LABELS[connection.provider],
                      })}
                </span>
                <span class="break-all text-xs font-500 text-muted-foreground">
                  {connection.accountLabel}
                </span>
              </span>
            </PButton>
          </div>
        )}
      </For>
    </Show>
  )
}
