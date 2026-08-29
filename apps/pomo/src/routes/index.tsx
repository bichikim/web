import {Title} from '@solidjs/meta'
import {clientOnly} from '@solidjs/start'
import {onMount, Show} from 'solid-js'

import {AppsInTossLoadingPage} from '../components/AppsInTossLoadingPage'
import {getPomoHomeHref} from '../components/pomo-route'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

const AppsInTossHomePage = clientOnly(
  async () => {
    const homeModule = await import('../components/AppsInTossHomePage')
    return {default: homeModule.AppsInTossHomePage}
  },
  {lazy: true},
)

const LocaleRedirectPage = () => {
  onMount(() => {
    window.location.replace(getPomoHomeHref(getLocale()))
  })

  return (
    <main class="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
      <Title>Pomofi</Title>
      <p class="m-0 text-sm text-muted-foreground" role="status">
        {m.app_loading()}
      </p>
    </main>
  )
}

export default function RootPage() {
  return (
    <Show
      fallback={<LocaleRedirectPage />}
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
    >
      <AppsInTossHomePage fallback={<AppsInTossLoadingPage />} />
    </Show>
  )
}
