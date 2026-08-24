import {Title} from '@solidjs/meta'
import {onMount} from 'solid-js'

import * as m from '../paraglide/messages.js'
import {getLocale, localizeUrl} from '../paraglide/runtime.js'

export default function LocaleRedirectPage() {
  onMount(() => {
    const redirectUrl = localizeUrl(new URL(window.location.href), {locale: getLocale()})
    window.location.replace(redirectUrl)
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
