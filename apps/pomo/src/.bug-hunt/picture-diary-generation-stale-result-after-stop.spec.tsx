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
const secondPending = Promise.withResolvers<{blob: Blob; prompt: string}>()

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.mocked(runImageGeneration)
    .mockResolvedValueOnce(firstImage)
    .mockImplementationOnce(() => secondPending.promise)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should not keep the previous image applicable after stopping a new generation for a different scene', async () => {
  const onApply = vi.fn()
  render(() => <Generation initialIdea="첫 장면" onApply={onApply} />)
  const ideaField = screen.getByLabelText('어떤 장면을 그릴까요?')
  const generate = screen.getByRole('button', {name: '이미지 생성'})

  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  await screen.findByRole('button', {name: '이 그림 위에 그림 그리기'})
  expect(screen.getByAltText('First scene')).toBeInTheDocument()

  fireEvent.input(ideaField, {target: {value: '두 번째 장면'}})
  fireEvent.click(generate)
  await screen.findByRole('button', {name: '중지'})
  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  secondPending.resolve({blob: new Blob(['second'], {type: 'image/png'}), prompt: 'Second scene'})
  await secondPending.promise.catch(() => undefined)

  expect(screen.queryByRole('button', {name: '이 그림 위에 그림 그리기'})).not.toBeInTheDocument()
  expect(screen.queryByAltText('First scene')).not.toBeInTheDocument()
  expect(onApply).not.toHaveBeenCalled()
})
