/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AudioResults} from '../AudioResults'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should hide empty results and offer downloads for each generated model result', () => {
  const [results, setResults] = createSignal<ComponentProps<typeof AudioResults>['results']>([])
  const view = render(() => <AudioResults results={results()} />)
  expect(view.container).toBeEmptyDOMElement()
  setResults([
    {generationTime: 2450, modelId: 'full', url: 'blob:full'},
    {generationTime: 900, modelId: 'int8', url: 'blob:int8'},
  ])
  expect(screen.getByText('Full · AI 생성 음성')).toBeDefined()
  expect(screen.getByText('INT8 · AI 생성 음성')).toBeDefined()
  expect(view.container.querySelectorAll('audio')).toHaveLength(2)
  expect(
    screen
      .getAllByRole('link', {name: 'WAV 다운로드'})
      .map((link) => link.getAttribute('download')),
  ).toEqual(['pomo-voice-full.wav', 'pomo-voice-int8.wav'])
})
