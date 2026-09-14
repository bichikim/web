import {Show} from 'solid-js'

export const InstallationMetadata = () => (
  <Show
    when={
      import.meta.env.VITE_POMO_IS_APPS_IN_TOSS !== 'true' &&
      import.meta.env.VITE_POMO_IS_DESKTOP !== 'true'
    }
  >
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch.png" />
  </Show>
)
