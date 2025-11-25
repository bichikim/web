import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'
import {MetaProvider, Title} from '@solidjs/meta'
import 'solid-devtools'

export default function App() {
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
    </>
  )
}
