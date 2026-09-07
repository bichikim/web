/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useModelDownload} from 'src/features/model-download'
import {TextMoodPage} from '../TextMoodPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/features/model-download', () => ({
  useModelDownload: vi.fn(),
}))
vi.mock('src/components/CharacterStudio', () => ({CharacterStudio: () => <p>character studio</p>}))
vi.mock('src/components/PLayerReview', () => ({PLayerReview: () => <p>layer review</p>}))
vi.mock('src/components/VoiceGenerator', () => ({VoiceGenerator: () => <p>voice generator</p>}))
vi.mock('src/components/PServiceTerms', () => ({
  PServiceTerms: (props: {backHref: string; backLabel: string; platform: string}) => (
    <p>{`${props.backLabel}:${props.backHref}:${props.platform}`}</p>
  ),
}))
vi.mock('../chat/Workspace', () => ({
  ChatWorkspace: (props: {fallback?: JSX.Element}) => (
    <>
      <p>chat workspace</p>
      {props.fallback}
    </>
  ),
}))
vi.mock('../dialogue/Workspace', () => ({
  DialogueWorkspace: (props: {fallback?: JSX.Element}) => (
    <>
      <p>dialogue workspace</p>
      {props.fallback}
    </>
  ),
}))
vi.mock('../home/TextMoodCard', () => ({TextMoodCard: () => <p>text mood card</p>}))
vi.mock('../speech-to-text/Workspace', () => ({
  SpeechToTextWorkspace: (props: {fallback?: JSX.Element}) => (
    <>
      <p>speech workspace</p>
      {props.fallback}
    </>
  ),
}))
vi.mock('../text-mood/Workspace', () => ({
  TextMoodWorkspace: (props: {fallback?: JSX.Element}) => (
    <>
      <p>mood workspace</p>
      {props.fallback}
    </>
  ),
}))

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue({
    state: () => ({status: 'idle'}),
  } as ReturnType<typeof useModelDownload>)
})

afterEach(() => {
  cleanup()
})
it('should render its development page content', () => {
  render(() => <TextMoodPage />)
  expect(screen.getAllByText('mood workspace', {exact: false}).length).toBeGreaterThan(0)
})
