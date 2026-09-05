/** @vitest-environment jsdom */
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runImageGeneration} from 'src/features/image-generation/client'
import Generation from '../Generation'

vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:generated')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should generate from the diary text and apply the PNG only on request', async () => {
  const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'A walk'}
  vi.mocked(runImageGeneration).mockResolvedValue(image)
  const onApply = vi.fn()
  render(() => <Generation initialIdea="산책한 날" onApply={onApply} />)
  expect(screen.getByLabelText('어떤 장면을 그릴까요?')).toHaveValue('산책한 날')
  const generate = screen.getByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  const apply = await screen.findByRole('button', {name: '이 그림 위에 그림 그리기'})
  expect(screen.getByRole('combobox', {name: '화풍'})).toHaveValue('coloredPencil')
  expect(vi.mocked(runImageGeneration).mock.lastCall?.[0].style).toBe('coloredPencil')
  expect(onApply).not.toHaveBeenCalled()
  fireEvent.click(apply)
  expect(onApply).toHaveBeenCalledWith(image)
  cleanup()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated')
})

it('should disable generation on an unsupported device', async () => {
  vi.stubGlobal('navigator', {})
  render(() => <Generation initialIdea="산책" />)
  await screen.findByText(/WebGPU와 shader-f16/)
  expect(screen.getByRole('button', {name: '이미지 생성'})).toBeDisabled()
})

it('should cancel running generation when the editor is dismissed', async () => {
  vi.mocked(runImageGeneration).mockReturnValue(new Promise(() => {}))
  const view = render(() => <Generation initialIdea="산책" />)
  const generate = screen.getByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  const call = vi.mocked(runImageGeneration).mock.lastCall?.[0]
  expect(call?.signal.aborted).toBe(false)
  view.unmount()
  expect(call?.signal.aborted).toBe(true)
})

it('should show generation failures and allow retry', async () => {
  vi.mocked(runImageGeneration).mockRejectedValueOnce(new Error('GPU failed'))
  render(() => <Generation initialIdea="산책" />)
  const generate = screen.getByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  expect(await screen.findByRole('alert')).toHaveTextContent('GPU failed')
  expect(generate).toBeEnabled()
  expect(screen.queryByRole('button', {name: '이 그림 위에 그림 그리기'})).not.toBeInTheDocument()
})

it('should stop generation and ignore a late image result', async () => {
  const pending = Promise.withResolvers<{blob: Blob; prompt: string}>()
  vi.mocked(runImageGeneration).mockReturnValue(pending.promise)
  render(() => <Generation initialIdea="산책" />)
  const generate = screen.getByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  const call = vi.mocked(runImageGeneration).mock.lastCall?.[0]
  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  expect(call?.signal.aborted).toBe(true)
  pending.resolve({blob: new Blob(['png'], {type: 'image/png'}), prompt: 'Late image'})
  await pending.promise
  expect(screen.queryByRole('button', {name: '이 그림 위에 그림 그리기'})).not.toBeInTheDocument()
  expect(generate).toBeEnabled()
})

it.each(['none', 'watercolor'])(
  'should submit the selected %s style without changing the scene',
  async (style) => {
    vi.mocked(runImageGeneration).mockReturnValue(new Promise(() => {}))
    render(() => <Generation initialIdea="산책" />)
    const select = screen.getByRole('combobox', {name: '화풍'})
    fireEvent.change(select, {target: {value: style}})
    const generate = screen.getByRole('button', {name: '이미지 생성'})
    await waitFor(() => expect(generate).toBeEnabled())
    fireEvent.click(generate)
    expect(vi.mocked(runImageGeneration).mock.lastCall?.[0]).toMatchObject({idea: '산책', style})
    expect(select).toBeDisabled()
  },
)
