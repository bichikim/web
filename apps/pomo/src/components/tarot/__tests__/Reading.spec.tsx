/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {type Accessor, createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {Reading} from '../Reading'
import {PModelDownloadProvider} from '../../../features/model-download'
import {useTarotSpeech} from '../../../features/tarot'

interface ReadingFixtureProps {
  readonly generating: Accessor<boolean>
  readonly output: Accessor<string>
}

const ReadingFixture = (props: ReadingFixtureProps) => {
  const speech = useTarotSpeech({locale: () => 'ko', text: props.output})
  return <Reading generating={props.generating()} output={props.output()} speech={speech} visible />
}

it('should show the reading divider before the first token and keep it when the reading completes', () => {
  const [generating, setGenerating] = createSignal(true)
  const [output, setOutput] = createSignal('')
  render(() => (
    <PModelDownloadProvider>
      <Reading generating={generating()} output={output()} />
    </PModelDownloadProvider>
  ))

  const divider = screen.getByRole('heading', {name: '카드 해석'})
  expect(divider.closest('section')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('status')).toHaveTextContent('카드를 해석하고 있어요')

  setOutput('카드가 보여주는 이야기')
  setGenerating(false)
  expect(screen.getByRole('heading', {name: '카드 해석'})).toBe(divider)
  expect(divider.closest('section')).toHaveAttribute('aria-busy', 'false')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText('카드가 보여주는 이야기')).toBeInTheDocument()
})

it('should show playback only while generating or when a result exists', () => {
  const [generating, setGenerating] = createSignal(false)
  const [output, setOutput] = createSignal('')
  render(() => (
    <PModelDownloadProvider>
      <ReadingFixture generating={generating} output={output} />
    </PModelDownloadProvider>
  ))

  expect(screen.getByRole('heading', {name: '카드 해석'})).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '해석 음성 재생'})).not.toBeInTheDocument()
  setGenerating(true)
  const playback = screen.getByRole('button', {name: '카드를 해석하고 있어요…'})
  expect(playback).toBeDisabled()
  setOutput('카드가 보여주는 이야기')
  setGenerating(false)
  expect(screen.getByRole('button')).toBe(playback)
  expect(screen.getByText('카드가 보여주는 이야기')).toBeInTheDocument()
  setOutput('')
  expect(screen.queryByRole('button', {name: '해석 음성 재생'})).not.toBeInTheDocument()
  setGenerating(true)
  expect(screen.getByRole('button', {name: '카드를 해석하고 있어요…'})).toBeInTheDocument()
  setGenerating(false)
  expect(screen.queryByRole('button', {name: '해석 음성 재생'})).not.toBeInTheDocument()
})
