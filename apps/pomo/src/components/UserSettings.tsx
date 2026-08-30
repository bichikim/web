import {Tabs} from '@kobalte/core/tabs'
import {Match, Show, Switch} from 'solid-js'

import {useUserSettings} from '../features/user-auth/use-user-settings'
import {PServicePolicyLinks} from './PServicePolicyLinks'
import {PSettingsActionLink} from './settings/ActionLink'
import {PSettingsSectionHeading} from './settings/SectionHeading'
import * as m from '@paraglide/message'

export const UserSettings = () => {
  const settings = useUserSettings()

  return (
    <Tabs.Content value="user">
      <section class="grid gap-4.5 settings-compact:gap-4">
        <div class="rounded-panel border border-solid border-[rgb(255_255_255_/_6%)] bg-[rgb(255_255_255_/_3%)] p-4">
          <Switch>
            <Match when={settings.state().kind === 'loading'}>
              <p class="m-0 text-sm text-muted-foreground" role="status">
                {m.user_loading()}
              </p>
            </Match>
            <Match when={settings.authenticatedUser()}>
              {(account) => (
                <div class="grid gap-3">
                  <div class="flex items-center gap-2 text-sm font-750 text-foreground">
                    <span aria-hidden="true" class="i-tabler-circle-check size-4 text-highlight" />
                    {m.user_signed_in()}
                  </div>
                  <dl class="m-0 grid gap-2 text-sm">
                    <div class="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                      <dt class="text-muted-foreground">{m.user_sign_in_method()}</dt>
                      <dd class="m-0 font-650">
                        {account().provider === 'toss' ? m.user_toss() : m.user_email_link()}
                      </dd>
                    </div>
                    <Show when={settings.authenticatedEmail()}>
                      {(email) => (
                        <div class="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                          <dt class="text-muted-foreground">{m.user_email()}</dt>
                          <dd class="m-0 break-all font-650">{email()}</dd>
                        </div>
                      )}
                    </Show>
                  </dl>
                </div>
              )}
            </Match>
            <Match when={settings.state().kind === 'anonymous'}>
              <div class="grid gap-2">
                <p class="m-0 text-sm font-750 text-foreground">{m.user_anonymous()}</p>
                <p class="m-0 text-xs leading-5 text-muted-foreground">
                  {m.user_anonymous_description()}
                </p>
              </div>
            </Match>
            <Match when={settings.state().kind === 'error'}>
              <p class="m-0 text-sm leading-6 text-danger" role="alert">
                {m.user_error()}
              </p>
            </Match>
          </Switch>
        </div>

        <PSettingsActionLink
          class="min-h-control-md w-fit"
          href="/account"
          icon="i-tabler-user-circle"
        >
          <Switch>
            <Match when={settings.authenticatedUser()?.provider === 'toss'}>
              {m.user_link_web()}
            </Match>
            <Match when={settings.state().kind === 'authenticated'}>
              {m.user_manage_account()}
            </Match>
            <Match when>{m.user_sign_in()}</Match>
          </Switch>
        </PSettingsActionLink>

        <section aria-labelledby="pomo-service-information-title" class="grid gap-3">
          <PSettingsSectionHeading
            title={m.user_service_information()}
            titleId="pomo-service-information-title"
          />
          <PServicePolicyLinks />
        </section>
      </section>
    </Tabs.Content>
  )
}
