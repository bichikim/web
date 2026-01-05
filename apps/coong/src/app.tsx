import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './global.css'
import 'solid-devtools'
import {Router} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {clientOnly} from '@solidjs/start'
import {Suspense} from 'solid-js'
import {SToastProvider} from 'src/components/toast'
import {ServiceWorkerProvider} from 'src/components/service-worker'
import {MetaProvider, Title} from '@solidjs/meta'
import {useCurrentMatches, useNavigate} from '@solidjs/router'
import {FontImport} from './components/font-import/FontImport'
import {createMemo, untrack} from 'solid-js'
import {HRouterNameProvider} from 'src/components/anchor/HRouterName'
import {useNameNavigate} from 'src/components/anchor/nameNavigate'

const routerName = {
  'change-password': '/auth/change-password',
  home: '/',
  musics: '/musics',
  piano: '/piano',
  'reset-password': '/auth/reset-password',
  'sign-in': '/auth/sign-in',
  'sign-up': '/auth/sign-up',
  'verify-email': '/auth/verify-email',
}

export const useAuthGuard = () => {
  const navigate = useNameNavigate()
  const matches = useCurrentMatches()

  const allPublic = createMemo(() => matches().every((match) => match.route?.info?.public ?? false))

  const handleRedirectSignIn = () => {
    navigate('sign-in')
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
          {/* router name provider for HAnchor component */}
          <HRouterNameProvider routerName={routerName}>
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
          </HRouterNameProvider>
          <ClientOnlyReloadPrompt pageReload={true} />
        </ServiceWorkerProvider>
      </SToastProvider>
      <FontImport />
    </>
  )
}
