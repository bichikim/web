import {type JSX, Show} from 'solid-js'

import {useTossAccount} from '../../features/user-auth/use-toss-account'
import * as m from '@paraglide/message'
import {PButton} from '../PButton'
import {PFormMessage} from '../PFormMessage'
import {PTextField} from '../PTextField'

export const TossAccount = () => {
  const account = useTossAccount()

  const handleEmailLink: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    if (!(event.currentTarget instanceof HTMLFormElement)) {
      return
    }
    await account.onEmailLink(new FormData(event.currentTarget))
  }

  return (
    <Show
      when={!account.isLoading()}
      fallback={<p class="m-0 text-sm text-muted-foreground">{m.account_toss_checking()}</p>}
    >
      <Show
        when={account.isAuthenticated()}
        fallback={
          <div class="grid gap-5">
            <p class="m-0 text-sm leading-6 text-muted-foreground">{m.account_toss_intro()}</p>
            <PButton
              class="w-full"
              disabled={account.isSubmitting()}
              onPress={() => account.onLogin()}
            >
              {account.isSubmitting() ? m.account_toss_confirming() : m.account_toss_start()}
            </PButton>
          </div>
        }
      >
        <div class="grid gap-6">
          <div class="rounded-3 border border-border bg-content-surface px-4 py-4">
            <p class="m-0 text-sm font-750">{m.account_toss_active()}</p>
            <p class="mb-0 mt-1 text-xs leading-5 text-muted-foreground">
              {m.account_toss_email_optional()}
            </p>
          </div>

          <form
            action="/api/account/link-email"
            class="grid gap-4"
            method="post"
            onSubmit={handleEmailLink}
          >
            <div>
              <h2 class="m-0 text-base font-750">{m.account_toss_use_on_web()}</h2>
              <p class="mb-0 mt-1 text-xs leading-5 text-muted-foreground">
                {m.account_toss_web_description()}
              </p>
            </div>
            <PTextField
              autoComplete="email"
              disabled={account.isSubmitting()}
              inputMode="email"
              label={m.account_toss_email_label()}
              name="email"
              onChange={account.onEmailChange}
              required
              type="email"
              value={account.email()}
            />
            <PButton class="w-full" disabled={account.isSubmitting()} type="submit">
              {account.isSubmitting() ? m.account_toss_sending_email() : m.account_toss_link_web()}
            </PButton>
          </form>

          <PButton
            class="w-full"
            disabled={account.isSubmitting()}
            onPress={() => account.onLogout()}
            tone="secondary"
          >
            {m.account_toss_logout()}
          </PButton>
        </div>
      </Show>

      <Show when={account.errorMessage()}>
        {(message) => (
          <PFormMessage class="mt-5" tone="error">
            {message()}
          </PFormMessage>
        )}
      </Show>
      <Show when={account.successMessage()}>
        {(message) => (
          <PFormMessage class="mt-5" tone="success">
            {message()}
          </PFormMessage>
        )}
      </Show>
    </Show>
  )
}
