import {Meta, Title} from '@solidjs/meta'
import {type Component, type JSX, lazy, Show} from 'solid-js'

const DEV_PAGE_COMPONENTS: Readonly<Partial<Record<string, Component>>> = {
  '/dev': lazy(async () => {
    const {HomePage} = await import('./HomePage')
    return {default: HomePage}
  }),
  '/dev/character': lazy(async () => {
    const {CharacterPage} = await import('./CharacterPage')
    return {default: CharacterPage}
  }),
  '/dev/chat': lazy(async () => {
    const {ChatPage} = await import('./ChatPage')
    return {default: ChatPage}
  }),
  '/dev/dialogue': lazy(async () => {
    const {DialoguePage} = await import('./DialoguePage')
    return {default: DialoguePage}
  }),
  '/dev/focus-room-layer-review': lazy(async () => {
    const {LayerReviewPage} = await import('./LayerReviewPage')
    return {default: LayerReviewPage}
  }),
  '/dev/hwp': lazy(async () => {
    const {HwpPage} = await import('./HwpPage')
    return {default: HwpPage}
  }),
  '/dev/image-generation': lazy(async () => {
    const {ImageGenerationPage} = await import('./ImageGenerationPage')
    return {default: ImageGenerationPage}
  }),
  '/dev/options': lazy(async () => {
    const {OptionResetPage} = await import('./OptionResetPage')
    return {default: OptionResetPage}
  }),
  '/dev/recovery': lazy(async () => {
    const {RecoveryPage} = await import('./RecoveryPage')
    return {default: RecoveryPage}
  }),
  '/dev/speech-to-text': lazy(async () => {
    const {SpeechToTextPage} = await import('./SpeechToTextPage')
    return {default: SpeechToTextPage}
  }),
  '/dev/storage': lazy(async () => {
    const {StoragePage} = await import('./StoragePage')
    return {default: StoragePage}
  }),
  '/dev/terms': lazy(async () => {
    const {TermsPage} = await import('./TermsPage')
    return {default: TermsPage}
  }),
  '/dev/text-mood': lazy(async () => {
    const {TextMoodPage} = await import('./TextMoodPage')
    return {default: TextMoodPage}
  }),
  '/dev/voice': lazy(async () => {
    const {VoicePage} = await import('./VoicePage')
    return {default: VoicePage}
  }),
}

const TERMS_DESCRIPTION =
  'Pomofi 집중 도구, 콘텐츠, AI 음성 기능의 이용 조건과 이용자의 권리·의무를 안내합니다.'

export interface PageDispatcherProps {
  fallback: JSX.Element
  pathname: string
}

const normalizePathname = (pathname: string) => pathname.replace(/\/+$/u, '') || '/'

export function PageDispatcher(props: PageDispatcherProps) {
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
