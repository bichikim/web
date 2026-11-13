import {MetaProvider} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'
import {SPageShell} from './components/layout/SPageShell'
import 'virtual:uno.css'

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <SPageShell>
            <Suspense>{props.children}</Suspense>
          </SPageShell>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
