import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {clientOnly} from '@solidjs/start'
import {Show, Suspense} from 'solid-js'
import {SToastProvider} from 'src/components/toast'
import {ServiceWorkerProvider} from 'src/components/service-worker'
import {MetaProvider, Title} from '@solidjs/meta'
import {useCurrentMatches, useLocation, useNavigate} from '@solidjs/router'
import {FontImport} from './components/font-import/FontImport'
import 'solid-devtools'
import {createMemo, untrack} from 'solid-js'
import {SIGN_IN_PATH} from 'src/utils/route-names'

export const useAuthGuard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const matches = useCurrentMatches()

  const allPublic = createMemo(() => matches().every((match) => match.route?.info?.public ?? false))

  const handleRedirectSignIn = () => {
    navigate(SIGN_IN_PATH)
  }

  console.log(
    'allPublic!!',
    untrack(() => allPublic()),
  )

  if (untrack(() => !allPublic())) {
    // todo call handleRedirectSignIn
    console.log('redirecting to sign in')
  }
}

const ClientOnlyReloadPrompt = clientOnly(() => import('src/components/reload-prompt'))

export default function App() {
  return (
    <>
      <SToastProvider>
        <ServiceWorkerProvider src="/sw.js">
          <Router
            root={(props) => {
              useAuthGuard()

              return (
                <MetaProvider>
                  <Title>Coong</Title>
                  <Suspense>{props.children}</Suspense>
                </MetaProvider>
              )
            }}
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
