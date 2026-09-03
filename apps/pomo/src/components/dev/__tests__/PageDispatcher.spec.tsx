/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import PageDispatcher from '../PageDispatcher'

const createPage = (name: string) => () => <output data-testid="dev-page">{name}</output>

vi.mock('@solidjs/meta', () => ({
  Meta: (props: {content: string; name: string}) => (
    <output data-testid={`meta-${props.name}`}>{props.content}</output>
  ),
  Title: (props: {children: JSX.Element}) => <output data-testid="title">{props.children}</output>,
}))

vi.mock('../HomePage', () => ({default: createPage('home')}))
vi.mock('../CharacterPage', () => ({default: createPage('character')}))
vi.mock('../ChatPage', () => ({default: createPage('chat')}))
vi.mock('../DialoguePage', () => ({default: createPage('dialogue')}))
vi.mock('../LayerReviewPage', () => ({default: createPage('layer-review')}))
vi.mock('../OptionResetPage', () => ({default: createPage('option-reset')}))
vi.mock('../RecoveryPage', () => ({default: createPage('recovery')}))
vi.mock('../SpeechToTextPage', () => ({default: createPage('speech-to-text')}))
vi.mock('../StoragePage', () => ({default: createPage('storage')}))
vi.mock('../TermsPage', () => ({default: createPage('terms')}))
vi.mock('../TextMoodPage', () => ({default: createPage('text-mood')}))
vi.mock('../VoicePage', () => ({default: createPage('voice')}))

afterEach(() => {
  cleanup()
})

it.each([
  ['/dev', 'home'],
  ['/dev/character', 'character'],
  ['/dev/chat', 'chat'],
  ['/dev/dialogue', 'dialogue'],
  ['/dev/focus-room-layer-review', 'layer-review'],
  ['/dev/options', 'option-reset'],
  ['/dev/recovery', 'recovery'],
  ['/dev/speech-to-text', 'speech-to-text'],
  ['/dev/storage', 'storage'],
  ['/dev/terms', 'terms'],
  ['/dev/text-mood', 'text-mood'],
  ['/dev/voice', 'voice'],
])('should dispatch %s to the %s development page', async (pathname, expectedPage) => {
  render(() => <PageDispatcher fallback={<output>404</output>} pathname={pathname} />)

  expect((await screen.findByTestId('dev-page')).textContent).toBe(expectedPage)
})

it('should preserve a development page URL with a trailing slash', async () => {
  render(() => <PageDispatcher fallback={<output>404</output>} pathname="/dev/chat/" />)

  expect((await screen.findByTestId('dev-page')).textContent).toBe('chat')
})

it('should render the 404 fallback for an unknown development path', () => {
  const result = render(() => (
    <PageDispatcher
      fallback={<output data-testid="not-found">404</output>}
      pathname="/dev/unknown"
    />
  ))

  expect(screen.getByTestId('not-found').textContent).toBe('404')

  result.unmount()
  render(() => (
    <PageDispatcher fallback={<output data-testid="root-fallback">root</output>} pathname="///" />
  ))
  expect(screen.getByTestId('root-fallback').textContent).toBe('root')
})

it('should own the development terms metadata', async () => {
  render(() => <PageDispatcher fallback={<output>404</output>} pathname="/dev/terms" />)

  await screen.findByTestId('dev-page')
  expect(screen.getByTestId('title').textContent).toBe('Pomofi — 서비스 이용약관')
  expect(screen.getByTestId('meta-description').textContent).toBe(
    'Pomofi 집중 도구, 콘텐츠, AI 음성 기능의 이용 조건과 이용자의 권리·의무를 안내합니다.',
  )
})
