// tailwind style reset css
import '@unocss/reset/tailwind.css'
// unocss
import 'virtual:uno.css'
// fix global css
import './global.css'
// solid devtools run only in dev mode
import 'solid-devtools'
import {RouteDefinition as _RouteDefinition, Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {clientOnly} from '@solidjs/start'
import {Suspense} from 'solid-js'
import {SToastProvider} from 'src/components/toast'
import {ServiceWorkerProvider} from 'src/components/service-worker'
import {MetaProvider, Title} from '@solidjs/meta'
import {FontImport} from './components/font-import/FontImport'

// no-way to test 'import(...) because clientOnly is mocked
/* istanbul ignore next -- @preserve */
const ReloadPrompt = clientOnly(() => import('src/components/reload-prompt'))

/**
 * Root application component
 * Provides toast notifications, service worker, routing, and font imports
 */
export default function App() {
  return (
    <>
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
          <ReloadPrompt pageReload={true} />
        </ServiceWorkerProvider>
      </SToastProvider>
      <FontImport />
    </>
  )
}
