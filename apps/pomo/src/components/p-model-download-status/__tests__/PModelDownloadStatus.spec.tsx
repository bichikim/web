/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type ModelDownloadItem, useModelDownload} from '../../../features/model-download'
import {createModelDownloadController} from '../../../features/model-download/controller'
import {PModelDownloadStatus} from '../PModelDownloadStatus'

vi.mock('../../../features/model-download', () => ({useModelDownload: vi.fn()}))
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

it('should keep the cancel button and its focus during progress updates', () => {
  const target = {kind: 'text', modelId: 'gemma-4-e2b'} as const
  setItems([{label: 'Gemma', percentage: 8, status: 'loading', target}])
  render(() => <PModelDownloadStatus />)
  const cancel = screen.getByRole('button', {name: '취소'})
  cancel.focus()
  fireEvent.pointerDown(cancel, {button: 0, pointerType: 'mouse'})

  setItems([{label: 'Gemma', percentage: 9, status: 'loading', target: {...target}}])
  expect(screen.getByText('Gemma 모델 받는 중 · 9%')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '취소'})).toBe(cancel)
  expect(cancel).toHaveFocus()
  fireEvent.pointerUp(cancel, {button: 0, pointerType: 'mouse'})
  fireEvent.click(cancel)
  expect(controller.cancel).toHaveBeenCalledExactlyOnceWith(target)
})

it('should update controls through queued, loading, error and retry states for the same model', () => {
  const target = {kind: 'text', modelId: 'gemma-4-e2b'} as const
  setItems([{label: 'Gemma', status: 'queued', target}])
  const view = render(() => <PModelDownloadStatus />)
  expect(screen.getByRole('status')).toHaveTextContent('Gemma · 다운로드 대기 중')

  setItems([{label: 'Gemma', percentage: 8, status: 'loading', target: {...target}}])
  expect(screen.getByRole('status')).toHaveTextContent('Gemma 모델 받는 중 · 8%')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '8')

  setItems([{label: 'Gemma', message: '연결 실패', status: 'error', target: {...target}}])
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '취소'})).not.toBeInTheDocument()
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('Gemma: 연결 실패')
  fireEvent.click(within(alert).getByRole('button', {name: '닫기'}))
  expect(controller.dismissError).toHaveBeenCalledExactlyOnceWith(target)

  setItems([{label: 'Gemma', status: 'queued', target: {...target}}])
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Gemma · 다운로드 대기 중')

  setItems([{label: 'Gemma', percentage: 0, status: 'loading', target: {...target}}])
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  expect(controller.cancel).toHaveBeenCalledExactlyOnceWith(target)
  setItems([])
  expect(view.container).toBeEmptyDOMElement()
})

it('should retain the focused cancel button while updating download progress', () => {
  const target = {kind: 'voice', modelId: 'full'} as const
  setItems([{label: '음성', percentage: 10, status: 'loading', target}])
  render(() => <PModelDownloadStatus />)
  const cancel = screen.getByRole('button', {name: '취소'})
  cancel.focus()
  setItems([{label: '음성', percentage: 65, status: 'loading', target: {...target}}])
  expect(screen.getByRole('button', {name: '취소'})).toBe(cancel)
  expect(cancel).toHaveFocus()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '65')
  expect(screen.getByText('음성 모델 받는 중 · 65%')).toBeVisible()
  fireEvent.click(cancel)
  expect(controller.cancel).toHaveBeenCalledWith(target)
})

it('should update retained downloads through queue, loading, error, and removal', () => {
  const target = {kind: 'voice', modelId: 'full'} as const
  setItems([{label: '음성', status: 'queued', target}])
  render(() => <PModelDownloadStatus />)
  expect(screen.getByText('음성 · 다운로드 대기 중')).toBeVisible()
  setItems([{label: '음성', percentage: 25, status: 'loading', target}])
  expect(screen.queryByText('음성 · 다운로드 대기 중')).toBeNull()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  setItems([{label: '음성', message: '전송 실패', status: 'error', target}])
  expect(screen.queryByRole('progressbar')).toBeNull()
  const dismiss = screen.getByRole('button', {name: '닫기'})
  setItems([{label: '음성', message: '재시도 실패', status: 'error', target}])
  expect(screen.getByRole('button', {name: '닫기'})).toBe(dismiss)
  expect(screen.getByRole('alert')).toHaveTextContent('재시도 실패')
  fireEvent.click(dismiss)
  expect(controller.dismissError).toHaveBeenCalledWith(target)
  setItems([])
  expect(screen.queryByLabelText('모델 다운로드 목록')).toBeNull()
})
