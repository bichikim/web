/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type ModelDownloadItem, useModelDownload} from '../../features/model-download'
import {createModelDownloadController} from '../../features/model-download/controller'
import {PModelDownloadStatus} from '../PModelDownloadStatus'

vi.mock('../../features/model-download', () => ({useModelDownload: vi.fn()}))
const [items, setItems] = createSignal<ReadonlyArray<ModelDownloadItem>>([])
let controller: ReturnType<typeof createModelDownloadController>
beforeEach(() => {
  controller = createModelDownloadController()
  vi.spyOn(controller, 'downloads').mockImplementation(items)
  vi.spyOn(controller, 'cancel')
  vi.spyOn(controller, 'dismissError')
  vi.mocked(useModelDownload).mockReturnValue(controller)
  setItems([])
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should stay hidden when the download list is empty', () => {
  expect(render(() => <PModelDownloadStatus />).container).toBeEmptyDOMElement()
})

it('should display every download and cancel only the selected queued model', () => {
  const text = {kind: 'text', modelId: 'gemma-4-e2b'} as const
  const image = {kind: 'image', modelId: 'ternary'} as const
  setItems([
    {label: '텍스트', percentage: 25, status: 'loading', target: text},
    {label: 'Bonsai', status: 'queued', target: image},
  ])
  render(() => <PModelDownloadStatus />)
  expect(screen.getByText('텍스트 모델 받는 중 · 25%')).toBeInTheDocument()
  const queued = screen.getByText('Bonsai · 다운로드 대기 중').parentElement!
  fireEvent.click(within(queued).getByRole('button', {name: '취소'}))
  expect(controller.cancel).toHaveBeenCalledWith(image)
  expect(controller.cancel).not.toHaveBeenCalledWith(text)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
})

it('should keep a dismissible error beside another active download', () => {
  const target = {kind: 'image', modelId: 'binary'} as const
  setItems([
    {label: 'Bonsai', message: '다운로드 실패', status: 'error', target},
    {label: '음성', percentage: 50, status: 'loading', target: {kind: 'voice', modelId: 'full'}},
  ])
  render(() => <PModelDownloadStatus />)
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('다운로드 실패')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  fireEvent.click(within(alert).getByRole('button', {name: '닫기'}))
  expect(controller.dismissError).toHaveBeenCalledWith(target)
})
