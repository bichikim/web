import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Show, Suspense} from 'solid-js'
import {ReloadPrompt} from 'src/components/reload-prompt'
import {useIsClient} from '@winter-love/solid-use'
import {SToastProvider} from 'src/components/toast'
import {ServiceWorkerProvider} from 'src/components/service-worker'
import {MetaProvider, Title} from '@solidjs/meta'
import {FontImport} from './components/font-import/FontImport'
import {queryClient} from 'src/utils/query'
import {QueryClientProvider} from '@tanstack/solid-query'
import 'solid-devtools'

export default function App() {
  const isClient = useIsClient()

  return (
    <QueryClientProvider client={queryClient}>
      <SToastProvider>
        <ServiceWorkerProvider src="/sw.js">
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
            <ReloadPrompt pageReload={true} />
          </Show>
        </ServiceWorkerProvider>
      </SToastProvider>
      <FontImport />
    </QueryClientProvider>
  )
}
