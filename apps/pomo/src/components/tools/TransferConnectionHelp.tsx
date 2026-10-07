import {createSignal, onMount, Show} from 'solid-js'
import * as m from '@paraglide/message'

export const TransferConnectionHelp = () => {
  const [isMac, setIsMac] = createSignal(false)

  onMount(() => {
    const browser = globalThis.navigator
    setIsMac(/Macintosh/u.test(browser.userAgent) && (browser.maxTouchPoints ?? 0) < 2)
  })

  return (
    <details class="text-sm leading-6 text-muted-foreground">
      <summary class="cursor-pointer rounded-control outline-none focus-visible:shadow-focus">
        {m.transfer_connection_help()}
      </summary>
      <Show when={isMac()}>
        <p class="mb-0 mt-2">{m.transfer_connection_help_mac()}</p>
      </Show>
      <p class="mb-0 mt-2">{m.transfer_connection_help_retry()}</p>
    </details>
  )
}
