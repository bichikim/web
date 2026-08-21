import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

import {Meta, MetaProvider, Title} from '@solidjs/meta'
import {Router, useLocation} from '@solidjs/router'
import {FileRoutes} from '@solidjs/start/router'
import {ErrorBoundary, Suspense} from 'solid-js'

import {PFocusRoomLayout} from './components/PFocusRoomLayout'
import {normalizePathname} from './components/pomo-route'
import {useAppsInTossSafeArea} from './features/apps-in-toss-safe-area'

const DEFAULT_DESCRIPTION =
  'Pomo와 함께 포모도로 타이머와 집중 음악을 사용하는 집중 앱 Pomofi입니다.'
const HOME_DESCRIPTION =
  'Pomo와 함께 장면, 포모도로, 음악, 대화와 피드를 한곳에서 사용하는 집중 앱 Pomofi입니다.'
const REFUND_POLICY_DESCRIPTION =
  'Pomofi 실물 응원 굿즈와 주간·월간 서비스 접근권의 환불 및 청약철회 기준을 안내합니다.'
const TERMS_DESCRIPTION = 'Pomofi AI 음성 생성 기능과 Supertonic 3 모델의 이용 조건을 안내합니다.'

const getTitle = (pathname: string) => {
  switch (normalizePathname(pathname)) {
    case '/refund-policy':
      return 'Pomofi — 환불 및 청약철회 정책'
    default:
      return 'Pomofi'
  }
}

const getDescription = (pathname: string) => {
  switch (normalizePathname(pathname)) {
    case '/':
      return HOME_DESCRIPTION
    case '/refund-policy':
      return REFUND_POLICY_DESCRIPTION
    case '/dev/terms':
      return TERMS_DESCRIPTION
    default:
      return DEFAULT_DESCRIPTION
  }
}

const PDocumentMetadata = () => {
  const location = useLocation()

  return (
    <>
      <Title>{getTitle(location.pathname)}</Title>
      <Meta content={getDescription(location.pathname)} name="description" />
    </>
  )
}

export default function App() {
  useAppsInTossSafeArea()

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <PDocumentMetadata />
          <ErrorBoundary
            fallback={(error) => (
              <main class="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
                <section class="max-w-md text-center">
                  <h1 class="text-2xl font-700">Pomofi를 불러오지 못했어요</h1>
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
