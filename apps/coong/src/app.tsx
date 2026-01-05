import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'
import 'solid-devtools'
import {Router, RouteDefinition as _RouteDefinition} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {clientOnly} from '@solidjs/start'
import {Suspense} from 'solid-js'
import {SToastProvider} from 'src/components/toast'
import {ServiceWorkerProvider} from 'src/components/service-worker'
import {MetaProvider, Title} from '@solidjs/meta'
import {FontImport} from './components/font-import/FontImport'

const ClientOnlyReloadPrompt = clientOnly(() => import('src/components/reload-prompt'))

export default function App() {
  return (
    <>
      <SToastProvider>
        <ServiceWorkerProvider src="/sw.js">
          {/* router name provider for HAnchor component */}

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
          <ClientOnlyReloadPrompt pageReload={true} />
        </ServiceWorkerProvider>
      </SToastProvider>
      <FontImport />
    </>
  )
}
