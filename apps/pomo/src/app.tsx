import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

import {MetaProvider} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'

import {PDocumentMetadata} from './components/PDocumentMetadata'
import {PFocusRoomLayout} from './components/PFocusRoomLayout'
import {PRecoveryBoundary} from './components/PRecoveryBoundary'
import {useApplicationRecovery} from './features/application-recovery'
import {useAppsInTossSafeArea} from './features/apps-in-toss-safe-area'
import {PModelDownloadProvider} from './features/model-download'

export default function App() {
  useAppsInTossSafeArea()
  const applicationRecovery = useApplicationRecovery()

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <PDocumentMetadata />
          <PModelDownloadProvider>
            <PRecoveryBoundary
              canRetry={applicationRecovery.canRetry}
              onError={applicationRecovery.onError}
              onReady={applicationRecovery.onReady}
              onReload={applicationRecovery.onReload}
              onRetry={applicationRecovery.onRetry}
            >
              <Suspense>
                <PFocusRoomLayout>{props.children}</PFocusRoomLayout>
              </Suspense>
            </PRecoveryBoundary>
          </PModelDownloadProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
