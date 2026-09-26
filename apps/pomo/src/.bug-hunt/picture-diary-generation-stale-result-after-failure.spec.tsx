/** @vitest-environment jsdom */
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {runImageGeneration} from 'src/features/image-generation/client'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {Generation} from '../components/memory-assist/picture-diary/Generation'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

const firstImage = {blob: new Blob(['first'], {type: 'image/png'}), prompt: 'First scene'}

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(runImageGeneration)
    .mockResolvedValueOnce(firstImage)
    .mockRejectedValueOnce(new Error('GPU failed'))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should clear the previous preview when a later generation fails for a new scene', async () => {
  render(() => <Generation initialIdea="첫 장면" />)
  const ideaField = screen.getByLabelText('어떤 장면을 그릴까요?')
  const generate = screen.getByRole('button', {name: '이미지 생성'})

  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  await screen.findByRole('button', {name: '이 그림 위에 그림 그리기'})

  fireEvent.input(ideaField, {target: {value: '두 번째 장면'}})
  fireEvent.click(generate)
  expect(await screen.findByRole('alert')).toHaveTextContent('GPU failed')

  expect(screen.queryByRole('button', {name: '이 그림 위에 그림 그리기'})).not.toBeInTheDocument()
  expect(screen.queryByAltText('First scene')).not.toBeInTheDocument()
})
