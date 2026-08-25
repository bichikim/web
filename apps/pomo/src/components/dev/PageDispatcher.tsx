import {Meta, Title} from '@solidjs/meta'
import {type Component, type JSX, lazy, Show} from 'solid-js'

const DEV_PAGE_COMPONENTS: Readonly<Partial<Record<string, Component>>> = {
  '/dev': lazy(() => import('./HomePage')),
  '/dev/character': lazy(() => import('./CharacterPage')),
  '/dev/chat': lazy(() => import('./ChatPage')),
  '/dev/dialogue': lazy(() => import('./DialoguePage')),
  '/dev/focus-room-layer-review': lazy(() => import('./LayerReviewPage')),
  '/dev/speech-to-text': lazy(() => import('./SpeechToTextPage')),
  '/dev/terms': lazy(() => import('./TermsPage')),
  '/dev/text-mood': lazy(() => import('./TextMoodPage')),
  '/dev/voice': lazy(() => import('./VoicePage')),
}

const TERMS_DESCRIPTION =
  'Pomofi 집중 도구, 콘텐츠, AI 음성 기능의 이용 조건과 이용자의 권리·의무를 안내합니다.'

export interface PageDispatcherProps {
  fallback: JSX.Element
  pathname: string
}

const normalizePathname = (pathname: string) => pathname.replace(/\/+$/u, '') || '/'

export default function PageDispatcher(props: PageDispatcherProps) {
  const pathname = () => normalizePathname(props.pathname)
  const Page = () => DEV_PAGE_COMPONENTS[pathname()]

  return (
    <>
      <Show when={pathname() === '/dev/terms'}>
        <Title>Pomofi — 서비스 이용약관</Title>
        <Meta content={TERMS_DESCRIPTION} name="description" />
      </Show>
      <Show keyed fallback={props.fallback} when={Page()}>
        {(Page) => <Page />}
      </Show>
    </>
  )
}
