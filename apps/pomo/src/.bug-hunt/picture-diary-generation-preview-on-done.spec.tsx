/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PictureDiaryDrawing} from 'src/components/memory-assist/picture-diary/Drawing'
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
import {runImageGeneration} from 'src/features/image-generation/client'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

const getComputedStyle = globalThis.getComputedStyle.bind(globalThis)

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
    },
  )
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const styles = getComputedStyle(element, pseudoElement)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should apply a generated preview when Done is pressed after switching to the draw tab', async () => {
  const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'Park scene'}
  vi.mocked(runImageGeneration).mockResolvedValue(image)
  const onImageChange = vi.fn()
  render(() => <PictureDiaryDrawing strokes={[]} onImageChange={onImageChange} idea="공원" />)
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  fireEvent.click(screen.getByRole('tab', {name: '이미지 생성'}))
  const generate = await screen.findByRole('button', {name: '이미지 생성'})
  await waitFor(() => expect(generate).toBeEnabled())
  fireEvent.click(generate)
  await screen.findByRole('img', {name: image.prompt})
  fireEvent.click(screen.getByRole('tab', {name: '직접 그리기'}))
  fireEvent.click(screen.getByRole('button', {name: '완료'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(onImageChange).toHaveBeenCalledWith(image)
})
