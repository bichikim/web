import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

import {MetaProvider, Title} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {ErrorBoundary, Suspense} from 'solid-js'

import {PFocusRoomLayout} from './components/PFocusRoomLayout'

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Pomo</Title>
          <ErrorBoundary
            fallback={(error) => (
              <main class="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
                <section class="max-w-md text-center">
                  <h1 class="text-2xl font-700">Pomo를 불러오지 못했어요</h1>
                  <p class="mt-3 opacity-70">{String(error)}</p>
                </section>
              </main>
            )}
          >
            <Suspense>
              <PFocusRoomLayout>{props.children}</PFocusRoomLayout>
            </Suspense>
          </ErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
