import 'virtual:uno.css'
import {MetaProvider, Title} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {createEffect, createSignal, Show, Suspense} from 'solid-js'
import {ReloadPrompt} from './ReloadPrompt'

export default function App() {
  const [isClient, setIsClient] = createSignal(false)

  createEffect(() => setIsClient(true))

  return (
    <>
      <Router
        root={(props) => (
          <MetaProvider>
            <Title>Coong</Title>
            <Suspense>{props.children}</Suspense>
          </MetaProvider>
        )}
      >
        <FileRoutes />
      </Router>
      <Show when={isClient()}>
        <ReloadPrompt />
      </Show>
    </>
  )
}
