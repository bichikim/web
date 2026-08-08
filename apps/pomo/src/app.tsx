import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'

import {MetaProvider, Title} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {ErrorBoundary, Suspense} from 'solid-js'

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Pomo</Title>
          <ErrorBoundary
            fallback={(error) => (
              <main class="grid min-h-dvh place-items-center bg-#17131f p-6 text-#f8edf1">
                <section class="max-w-md text-center">
                  <h1 class="text-2xl font-700">Pomo를 불러오지 못했어요</h1>
                  <p class="mt-3 opacity-70">{String(error)}</p>
                </section>
              </main>
            )}
          >
            <Suspense>{props.children}</Suspense>
          </ErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
