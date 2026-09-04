import {useAction} from '@solidjs/router'
import {type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'

import {
  requestAccountMagicLinkAction,
  signOutAccountSessionAction,
} from '../../features/auth/actions'
import {useWebAccount} from '../../features/user-auth/use-web-account'
import {PButton} from '../PButton'
import {PFormMessage} from '../PFormMessage'
import {PTextField} from '../PTextField'

export const WebAccount = () => {
  const account = useWebAccount()
  const requestMagicLink = useAction(requestAccountMagicLinkAction)
  const signOut = useAction(signOutAccountSessionAction)

  const handleMagicLinkSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await requestMagicLink(new FormData(event.currentTarget))
  }

  const handleSignOut: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await signOut(new FormData(event.currentTarget))
  }

  return (
    <>
      <Show
        when={!account.isLoading()}
        fallback={<p class="m-0 text-sm text-muted-foreground">{m.web_account_checking()}</p>}
      >
        <Show
          when={account.session()}
          fallback={
            <form
              action="/api/auth/sign-in/magic-link"
              class="grid gap-5"
              method="post"
              onSubmit={handleMagicLinkSubmit}
            >
              <p class="m-0 text-sm leading-6 text-muted-foreground">{m.web_account_intro()}</p>
              <PTextField
                autoComplete="email"
                disabled={account.isSubmitting()}
                inputMode="email"
                label={m.web_account_email()}
                name="email"
                onChange={account.onEmailChange}
                required
                type="email"
                value={account.email()}
              />
              <PButton class="w-full" disabled={account.isSubmitting()} type="submit">
                {account.isSubmitting() ? m.web_account_sending() : m.web_account_send()}
              </PButton>
            </form>
          }
        >
          {(session) => (
            <div class="grid gap-5">
              <div class="rounded-3 border border-border bg-content-surface px-4 py-4">
                <p class="m-0 text-xs text-muted-foreground">{m.web_account_signed_in_email()}</p>
                <p class="mb-0 mt-1 break-all text-sm font-700">{session().email}</p>
              </div>
              <form action="/api/auth/sign-out" method="post" onSubmit={handleSignOut}>
                <PButton
                  class="w-full"
                  disabled={account.isSubmitting()}
                  tone="secondary"
                  type="submit"
                >
                  {m.web_account_sign_out()}
                </PButton>
              </form>
            </div>
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
      <Show when={account.errorMessage()}>
        {(message) => (
          <PFormMessage class="mt-5" tone="error">
            {message()}
          </PFormMessage>
        )}
      </Show>
    </>
  )
}
