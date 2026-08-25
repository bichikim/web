import {type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'

import {useWebAccount} from '../../features/user-auth/use-web-account'
import {
  ACCOUNT_ERROR_CLASSES,
  ACCOUNT_FIELD_CLASSES,
  ACCOUNT_PRIMARY_BUTTON_CLASSES,
  ACCOUNT_SECONDARY_BUTTON_CLASSES,
  ACCOUNT_SUCCESS_CLASSES,
} from './styles'

export const WebAccount = () => {
  const account = useWebAccount()

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await account.onSubmit(new URL(event.currentTarget.action).origin)
  }

  return (
    <>
      <Show
        when={!account.isLoading()}
        fallback={<p class="m-0 text-sm text-white/60">{m.web_account_checking()}</p>}
      >
        <Show
          when={account.session()}
          fallback={
            <form action="/api/auth/sign-in/magic-link" class="grid gap-5" onSubmit={handleSubmit}>
              <p class="m-0 text-sm leading-6 text-white/60">{m.web_account_intro()}</p>
              <label class="grid gap-2 text-sm font-650">
                {m.web_account_email()}
                <input
                  autocomplete="email"
                  class={ACCOUNT_FIELD_CLASSES}
                  inputmode="email"
                  onInput={(event) => account.onEmailChange(event.currentTarget.value)}
                  required
                  type="email"
                  value={account.email()}
                />
              </label>
              <button
                class={ACCOUNT_PRIMARY_BUTTON_CLASSES}
                disabled={account.isSubmitting()}
                type="submit"
              >
                {account.isSubmitting() ? m.web_account_sending() : m.web_account_send()}
              </button>
            </form>
          }
        >
          {(session) => (
            <div class="grid gap-5">
              <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
                <p class="m-0 text-xs text-white/45">{m.web_account_signed_in_email()}</p>
                <p class="mb-0 mt-1 break-all text-sm font-700">{session().email}</p>
              </div>
              <button
                class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
                disabled={account.isSubmitting()}
                onClick={() => account.onSignOut()}
                type="button"
              >
                {m.web_account_sign_out()}
              </button>
            </div>
          )}
        </Show>
        <Show when={account.successMessage()}>
          {(message) => (
            <p class={`${ACCOUNT_SUCCESS_CLASSES} mt-5`} role="status">
              {message()}
            </p>
          )}
        </Show>
      </Show>
      <Show when={account.errorMessage()}>
        {(message) => (
          <p class={`${ACCOUNT_ERROR_CLASSES} mt-5`} role="alert">
            {message()}
          </p>
        )}
      </Show>
    </>
  )
}
