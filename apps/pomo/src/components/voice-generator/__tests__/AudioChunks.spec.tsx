/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AudioChunks} from '../AudioChunks'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should hide empty chunks and describe the generated audio chunk', () => {
  const [chunks, setChunks] = createSignal<ComponentProps<typeof AudioChunks>['chunks']>([])
  const view = render(() => <AudioChunks chunks={chunks()} />)
  expect(view.container).toBeEmptyDOMElement()
  setChunks([{generationTime: 1250, index: 0, modelId: 'full', total: 2, url: 'blob:chunk'}])
  expect(screen.getByText('AI 생성 음성 · 청크 1/2')).toBeDefined()
  expect(screen.getByText('1.3초')).toBeDefined()
  expect(view.container.querySelectorAll('audio')).toHaveLength(1)
})
