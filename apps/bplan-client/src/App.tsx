import 'virtual:uno.css'
import {MetaProvider} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <a href="/">Index</a>
          <a href="/about">About</a>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
