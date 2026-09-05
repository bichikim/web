import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import type {CalendarProviderId} from '../features/calendar'
import {TossAccount} from './user-auth/TossAccount'
import {WebAccount} from './user-auth/WebAccount'
import {ACCOUNT_CARD_CLASSES, ACCOUNT_PAGE_CLASSES} from './user-auth/styles'
import * as m from '@paraglide/message'

export interface AccountPageProps {
  readonly connectedCalendarProvider?: CalendarProviderId
}

const CALENDAR_SUCCESS_ACTION_CLASSES = cx(
  'mt-8 flex min-h-11 items-center justify-center rounded-panel-inner px-5 font-750 no-underline',
  'bg-highlight text-background hover:opacity-90',
)

const getCalendarProviderLabel = (provider: CalendarProviderId) =>
  provider === 'google' ? m.calendar_provider_google() : m.calendar_provider_microsoft()

export const AccountPage = (props: AccountPageProps) => {
  const connectedProvider = () =>
    props.connectedCalendarProvider === undefined
      ? null
      : getCalendarProviderLabel(props.connectedCalendarProvider)

  return (
    <main class={ACCOUNT_PAGE_CLASSES}>
      <Show
        when={connectedProvider()}
        fallback={
          <>
            <Title>{m.account_title()}</Title>
            <section class={ACCOUNT_CARD_CLASSES}>
              <header class="mb-7">
                <a class="text-xs font-700 text-highlight no-underline hover:underline" href="/">
                  <span aria-hidden="true">←</span> {m.app_return()}
                </a>
                <p class="mb-0 mt-6 text-xs font-750 tracking-[0.24em] text-highlight uppercase">
                  Pomo account
                </p>
                <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.03em">{m.account_heading()}</h1>
              </header>

              {import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? (
                <TossAccount />
              ) : (
                <WebAccount />
              )}
            </section>
          </>
        }
      >
        {(provider) => (
          <>
            <Title>{m.calendar_connection_success_title({provider: provider()})}</Title>
            <section
              aria-labelledby="calendar-connection-success-title"
              class={ACCOUNT_CARD_CLASSES}
            >
              <span
                aria-hidden="true"
                class="grid size-13 place-items-center rounded-full bg-highlight/14 text-highlight"
              >
                <span class="i-tabler-calendar-check size-7" />
              </span>
              <p class="mb-0 mt-7 text-xs font-750 tracking-[0.2em] text-highlight uppercase">
                {m.calendar_connection_success_eyebrow()}
              </p>
              <h1
                class="mb-0 mt-3 break-keep text-3xl font-800 leading-tight tracking--0.03em"
                id="calendar-connection-success-title"
              >
                {m.calendar_connection_success_title({provider: provider()})}
              </h1>
              <a class={CALENDAR_SUCCESS_ACTION_CLASSES} href="/">
                {m.app_return()}
              </a>
            </section>
          </>
        )}
      </Show>
    </main>
  )
}
