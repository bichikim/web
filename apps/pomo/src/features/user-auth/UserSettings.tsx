import {Tabs} from '@kobalte/core/tabs'
import {createMemo, createSignal, Match, onMount, Show, Switch} from 'solid-js'

import {clearStoredAppSession, readStoredAppSession, validateAppSession} from './app-session'
import {readAccountSession} from './web-session'

type UserSettingsState =
  | {readonly kind: 'anonymous'}
  | {readonly email: string; readonly kind: 'authenticated'; readonly provider: 'email'}
  | {readonly kind: 'authenticated'; readonly provider: 'toss'}
  | {readonly kind: 'error'}
  | {readonly kind: 'loading'}

const readUserSettingsState = async (): Promise<UserSettingsState> => {
  if (!import.meta.env.POMO_IS_APPS_IN_TOSS) {
    const session = await readAccountSession()

    return session === null
      ? {kind: 'anonymous'}
      : {email: session.email, kind: 'authenticated', provider: 'email'}
  }

  const token = await readStoredAppSession()

  if (token === null) {
    return {kind: 'anonymous'}
  }

  if (await validateAppSession(token)) {
    return {kind: 'authenticated', provider: 'toss'}
  }

  await clearStoredAppSession()
  return {kind: 'anonymous'}
}

export const UserSettings = () => {
  const [state, setState] = createSignal<UserSettingsState>({kind: 'loading'})
  const authenticatedUser = createMemo(() => {
    const currentState = state()

    return currentState.kind === 'authenticated' ? currentState : null
  })
  const authenticatedEmail = createMemo(() => {
    const account = authenticatedUser()

    return account?.provider === 'email' ? account.email : null
  })

  onMount(() => {
    readUserSettingsState()
      .then(setState)
      .catch(() => setState({kind: 'error'}))
  })

  return (
    <Tabs.Content value="user">
      <section class="grid gap-6">
        <div class="rounded-4 border border-solid border-border bg-secondary-soft p-5">
          <Switch>
            <Match when={state().kind === 'loading'}>
              <p class="m-0 text-sm text-muted-foreground" role="status">
                계정 확인 중…
              </p>
            </Match>
            <Match when={authenticatedUser()}>
              {(account) => (
                <div class="grid gap-3">
                  <div class="flex items-center gap-2 text-sm font-750 text-foreground">
                    <span aria-hidden="true" class="i-tabler-circle-check size-4 text-highlight" />
                    로그인됨
                  </div>
                  <dl class="m-0 grid gap-2 text-sm">
                    <div class="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                      <dt class="text-muted-foreground">로그인 방식</dt>
                      <dd class="m-0 font-650">
                        {account().provider === 'toss' ? '토스' : '이메일 링크'}
                      </dd>
                    </div>
                    <Show when={authenticatedEmail()}>
                      {(email) => (
                        <div class="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                          <dt class="text-muted-foreground">이메일</dt>
                          <dd class="m-0 break-all font-650">{email()}</dd>
                        </div>
                      )}
                    </Show>
                  </dl>
                </div>
              )}
            </Match>
            <Match when={state().kind === 'anonymous'}>
              <div class="grid gap-2">
                <p class="m-0 text-sm font-750 text-foreground">로그인하지 않았어요.</p>
                <p class="m-0 text-xs leading-5 text-muted-foreground">
                  로그인하면 여러 환경에서 같은 Pomo 계정을 사용할 수 있어요.
                </p>
              </div>
            </Match>
            <Match when={state().kind === 'error'}>
              <p class="m-0 text-sm leading-6 text-danger" role="alert">
                로그인 상태를 확인하지 못했습니다. 계정 화면에서 다시 시도해 주세요.
              </p>
            </Match>
          </Switch>
        </div>

        <a
          class={
            'inline-flex min-h-control-md w-fit items-center justify-center gap-2 rounded-control ' +
            'bg-primary-strong px-5 py-3 text-sm font-750 text-white no-underline ' +
            'transition hover:bg-primary-strong-hover focus-visible:shadow-focus ' +
            'motion-reduce:transition-none'
          }
          href="/account"
        >
          <span aria-hidden="true" class="i-tabler-user-circle size-4.5" />
          {state().kind === 'authenticated' ? '계정 관리' : '로그인 / 가입'}
        </a>
      </section>
    </Tabs.Content>
  )
}
