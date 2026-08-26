/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {AudioChunks} from '../AudioChunks'
import {AudioResults} from '../AudioResults'

it('should hide empty audio output groups', () => {
  const result = render(() => (
    <>
      <AudioChunks chunks={[]} />
      <AudioResults results={[]} />
    </>
  ))

  expect(result.container).toBeEmptyDOMElement()
})

it('should render generated chunks and downloadable model results', () => {
  const result = render(() => (
    <>
      <AudioChunks
        chunks={[{generationTime: 1250, index: 0, modelId: 'full', total: 2, url: 'blob:chunk'}]}
      />
      <AudioResults
        results={[
          {generationTime: 2450, modelId: 'full', url: 'blob:full'},
          {generationTime: 900, modelId: 'int8', url: 'blob:int8'},
        ]}
      />
    </>
  ))

  expect(screen.getByText('AI 생성 음성 · 청크 1/2')).toBeDefined()
  expect(screen.getByText('1.3초')).toBeDefined()
  expect(screen.getByText('Full · AI 생성 음성')).toBeDefined()
  expect(screen.getByText('INT8 · AI 생성 음성')).toBeDefined()
  expect(result.container.querySelectorAll('audio')).toHaveLength(3)
  expect(
    screen
      .getAllByRole('link', {name: 'WAV 다운로드'})
      .map((link) => link.getAttribute('download')),
  ).toEqual(['pomo-voice-full.wav', 'pomo-voice-int8.wav'])
})
