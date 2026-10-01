import {PTooltipContent, PTooltipProvider} from './components/tooltip'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

import {MetaProvider} from '@solidjs/meta'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {Suspense} from 'solid-js'
import {PreferenceProvider} from './hooks/use-preference'
import {webLocalStorage} from './utils/preference-storage'

import {PDocumentMetadata} from './components/p-document-metadata/PDocumentMetadata'
import {PRecoveryBoundary} from './components/p-recovery-boundary/PRecoveryBoundary'
import {useApplicationRecovery} from './features/application-recovery'
import {SafeArea} from './components/safe-area/SafeArea'
import {DisplayThemeProvider} from './features/display-theme'
import {AuthProvider} from './features/auth'
import {PModelDownloadProvider} from './features/model-download'
import {Analytics} from './components/vercel'
import {ToastProvider} from '@winter-love/solid-components'

export default function App() {
  const applicationRecovery = useApplicationRecovery()

  return (
    <>
      <SafeArea />
      <Router
        root={(props) => (
          <MetaProvider>
            <Analytics />
            <PDocumentMetadata />
            <PreferenceProvider storage={webLocalStorage}>
              <DisplayThemeProvider>
                <PTooltipProvider>
                  <AuthProvider>
                    <PModelDownloadProvider>
                      <ToastProvider>
                        <PRecoveryBoundary
                          canRetry={applicationRecovery.canRetry}
                          onError={applicationRecovery.onError}
                          onReady={applicationRecovery.onReady}
                          onReload={applicationRecovery.onReload}
                          onRetry={applicationRecovery.onRetry}
                        >
                          <Suspense>{props.children}</Suspense>
                        </PRecoveryBoundary>
                      </ToastProvider>
                    </PModelDownloadProvider>
                  </AuthProvider>
                  <PTooltipContent />
                </PTooltipProvider>
              </DisplayThemeProvider>
            </PreferenceProvider>
          </MetaProvider>
        )}
      >
        <FileRoutes />
      </Router>
    </>
  )
}
