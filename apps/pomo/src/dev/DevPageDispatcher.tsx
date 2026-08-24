import {Meta, Title} from '@solidjs/meta'
import {type Component, type JSX, lazy, Show} from 'solid-js'

const DEV_PAGE_COMPONENTS: Readonly<Partial<Record<string, Component>>> = {
  '/dev': lazy(() => import('src/components/dev/HomePage')),
  '/dev/character': lazy(() => import('src/components/dev/CharacterPage')),
  '/dev/chat': lazy(() => import('src/components/dev/ChatPage')),
  '/dev/dialogue': lazy(() => import('src/components/dev/DialoguePage')),
  '/dev/focus-room-layer-review': lazy(() => import('src/components/dev/LayerReviewPage')),
  '/dev/speech-to-text': lazy(() => import('src/components/dev/SpeechToTextPage')),
  '/dev/terms': lazy(() => import('src/components/dev/TermsPage')),
  '/dev/text-mood': lazy(() => import('src/components/dev/TextMoodPage')),
  '/dev/voice': lazy(() => import('src/components/dev/VoicePage')),
}

const TERMS_DESCRIPTION =
  'Pomofi 집중 도구, 콘텐츠, AI 음성 기능의 이용 조건과 이용자의 권리·의무를 안내합니다.'

export interface DevPageDispatcherProps {
  fallback: JSX.Element
  pathname: string
}

const normalizePathname = (pathname: string) => pathname.replace(/\/+$/u, '') || '/'

export default function DevPageDispatcher(props: DevPageDispatcherProps) {
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
