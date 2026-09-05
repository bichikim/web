import {cx} from 'class-variance-authority'
import {createResource, createSignal, createUniqueId, For, Show} from 'solid-js'

import * as m from '@paraglide/message'

import {
  CALENDAR_PROVIDERS,
  type CalendarConnection,
  createCalendarAuthorization,
  deleteCalendarConnection,
  listCalendarConnections,
  openCalendarAuthorization,
} from '../features/calendar'
import {useAuth} from '../features/auth/AuthProvider'
import {PButton} from './PButton'

const PROVIDER_LABELS = {
  google: 'Google Calendar',
  microsoft: 'Microsoft Outlook',
} as const

interface CalendarConnectionsProps {
  readonly onConnectionsChange?: () => void
}

interface CalendarProviderActionsProps {
  readonly connections: ReadonlyArray<CalendarConnection>
  readonly confirmingId: string | null
  readonly onConnect: (provider: CalendarConnection['provider']) => void
  readonly onDisconnect: (connection: CalendarConnection) => void
  readonly pending: boolean
  readonly provider: CalendarConnection['provider']
}

const CalendarProviderActions = (props: CalendarProviderActionsProps) => {
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

export const CalendarConnections = (props: CalendarConnectionsProps) => {
  const authentication = useAuth()
  const popoverId = `pomo-calendar-settings-${createUniqueId()}`
  const titleId = `${popoverId}-title`
  const popoverAnchor = `--${popoverId}`
  const [connections, {refetch}] = createResource(
    () => authentication.session() !== null,
    listCalendarConnections,
  )
  const [confirmingId, setConfirmingId] = createSignal<string | null>(null)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [pendingAction, setPendingAction] = createSignal<string | null>(null)
  const [popoverElement, setPopoverElement] = createSignal<HTMLElement>()

  const togglePopover = () => {
    const popover = popoverElement()
    if (popover === undefined) {
      return
    }

    if (popover.matches(':popover-open')) {
      popover.hidePopover()
      return
    }

    popover.showPopover()
  }

  const connect = async (provider: CalendarConnection['provider']) => {
    setConfirmingId(null)
    setPendingAction(provider)
    setErrorMessage(null)
    try {
      const authorizationUrl = await createCalendarAuthorization(provider)
      await openCalendarAuthorization(authorizationUrl)
    } catch (error: unknown) {
      console.error('Failed to open calendar authorization', error)
      setErrorMessage(m.calendar_connections_failed())
    } finally {
      setPendingAction(null)
    }
  }

  const disconnect = async (connection: CalendarConnection) => {
    if (confirmingId() !== connection.id) {
      setConfirmingId(connection.id)
      return
    }

    setPendingAction(connection.id)
    setErrorMessage(null)
    try {
      await deleteCalendarConnection(connection.id)
      await refetch()
      setConfirmingId(null)
      props.onConnectionsChange?.()
    } catch (error: unknown) {
      console.error('Failed to disconnect calendar account', error)
      setErrorMessage(m.calendar_connections_failed())
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <>
      <button
        aria-controls={popoverId}
        aria-haspopup="dialog"
        aria-label={m.calendar_settings()}
        class={
          'grid size-9 place-items-center rounded-control border border-border ' +
          'bg-content-surface text-foreground outline-none hover:border-border-hover ' +
          'hover:bg-surface-interactive focus-visible:shadow-focus ' +
          '[anchor-name:var(--pomo-calendar-settings-anchor)]'
        }
        onClick={(event) => {
          event.preventDefault()
          togglePopover()
        }}
        popovertarget={popoverId}
        style={{'--pomo-calendar-settings-anchor': popoverAnchor}}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-settings size-5" />
      </button>

      <section
        aria-labelledby={titleId}
        class={cx(
          'fixed inset-auto m-0 mt-2 box-border w-[min(calc(100vw-2rem),22rem)]',
          'rounded-panel border border-border bg-modal-surface p-4 text-foreground shadow-panel',
          'backdrop-blur-surface [position-area:bottom_span-left]',
          '[position-anchor:var(--pomo-calendar-settings-anchor)]',
        )}
        id={popoverId}
        onToggle={(event) => {
          if (event.newState === 'closed') {
            setConfirmingId(null)
          }
        }}
        popover="auto"
        ref={setPopoverElement}
        role="dialog"
        style={{'--pomo-calendar-settings-anchor': popoverAnchor}}
      >
        <h2 class="m-0 text-base font-750" id={titleId}>
          {m.calendar_settings()}
        </h2>
        <p class="mb-4 mt-1 text-xs leading-5 text-muted-foreground">
          {m.calendar_connections_description()}
        </p>

        <Show
          when={authentication.state().kind !== 'anonymous'}
          fallback={<p>{m.calendar_connections_login_required()}</p>}
        >
          <Show
            when={!connections.loading && authentication.state().kind !== 'checking'}
            fallback={<p>{m.calendar_connections_loading()}</p>}
          >
            <Show
              when={authentication.state().kind !== 'unavailable' && !connections.error}
              fallback={<p role="alert">{m.calendar_connections_failed()}</p>}
            >
              <div class="grid gap-2">
                <For each={CALENDAR_PROVIDERS}>
                  {(provider) => (
                    <CalendarProviderActions
                      connections={connections() ?? []}
                      confirmingId={confirmingId()}
                      onConnect={connect}
                      onDisconnect={disconnect}
                      pending={pendingAction() !== null}
                      provider={provider}
                    />
                  )}
                </For>
              </div>
            </Show>
          </Show>
          <Show when={errorMessage()}>{(message) => <p role="alert">{message()}</p>}</Show>
        </Show>
      </section>
    </>
  )
}
