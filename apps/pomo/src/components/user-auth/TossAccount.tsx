import {type JSX, Show} from 'solid-js'

import {useTossAccount} from '../../features/user-auth/use-toss-account'
import {
  ACCOUNT_ERROR_CLASSES,
  ACCOUNT_FIELD_CLASSES,
  ACCOUNT_PRIMARY_BUTTON_CLASSES,
  ACCOUNT_SECONDARY_BUTTON_CLASSES,
  ACCOUNT_SUCCESS_CLASSES,
} from './styles'
import * as m from '@paraglide/message'

export const TossAccount = () => {
  const account = useTossAccount()

  const handleEmailLink: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await account.onEmailLink()
  }

  return (
    <Show
      when={!account.isLoading()}
      fallback={<p class="m-0 text-sm text-white/60">{m.account_toss_checking()}</p>}
    >
      <Show
        when={account.token()}
        fallback={
          <div class="grid gap-5">
            <p class="m-0 text-sm leading-6 text-white/60">{m.account_toss_intro()}</p>
            <button
              class={ACCOUNT_PRIMARY_BUTTON_CLASSES}
              disabled={account.isSubmitting()}
              onClick={() => account.onLogin()}
              type="button"
            >
              {account.isSubmitting() ? m.account_toss_confirming() : m.account_toss_start()}
            </button>
          </div>
        }
      >
        <div class="grid gap-6">
          <div class="rounded-3 border border-white/10 bg-white/5 px-4 py-4">
            <p class="m-0 text-sm font-750">{m.account_toss_active()}</p>
            <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
              {m.account_toss_email_optional()}
            </p>
          </div>

          <form class="grid gap-4" onSubmit={handleEmailLink}>
            <div>
              <h2 class="m-0 text-base font-750">{m.account_toss_use_on_web()}</h2>
              <p class="mb-0 mt-1 text-xs leading-5 text-white/50">
                {m.account_toss_web_description()}
              </p>
            </div>
            <label class="grid gap-2 text-sm font-650">
              {m.account_toss_email_label()}
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
              {account.isSubmitting() ? m.account_toss_sending_email() : m.account_toss_link_web()}
            </button>
          </form>

          <button
            class={ACCOUNT_SECONDARY_BUTTON_CLASSES}
            disabled={account.isSubmitting()}
            onClick={() => account.onLogout()}
            type="button"
          >
            {m.account_toss_logout()}
          </button>
        </div>
      </Show>

      <Show when={account.errorMessage()}>
        {(message) => (
          <p class={`${ACCOUNT_ERROR_CLASSES} mt-5`} role="alert">
            {message()}
          </p>
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
  )
}
