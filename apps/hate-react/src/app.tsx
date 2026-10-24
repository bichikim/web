import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'
import {MetaProvider, Title} from '@solidjs/meta'

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>I fucking hate React.</Title>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
