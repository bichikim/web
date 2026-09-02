/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

const cancel = vi.fn()
const dismissError = vi.fn()
const [state, setState] = createSignal<
  | {readonly status: 'idle'}
  | {readonly label: string; readonly percentage: number; readonly status: 'loading'}
  | {readonly message: string; readonly status: 'error'}
>({status: 'idle'})

vi.mock('../../features/model-download', () => ({
  useModelDownload: () => ({cancel, dismissError, state}),
}))
vi.mock('../PLoadingStatus', () => ({
  PLoadingStatus: (props: {readonly message: string; readonly onCancel: () => void}) => (
    <button onClick={props.onCancel} type="button">
      {props.message}
    </button>
  ),
}))

import {PModelDownloadStatus} from '../PModelDownloadStatus'

it('should stay hidden while no model download needs attention', () => {
  setState({status: 'idle'})
  const {container} = render(() => <PModelDownloadStatus />)

  expect(container).toBeEmptyDOMElement()
})

it('should render live download progress and cancel it', () => {
  setState({label: '음성', percentage: 25, status: 'loading'})
  render(() => <PModelDownloadStatus />)

  fireEvent.click(screen.getByRole('button', {name: '음성 모델 받는 중 · 25%'}))
  expect(cancel).toHaveBeenCalledOnce()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')

  setState({label: '텍스트', percentage: 80, status: 'loading'})
  expect(screen.getByRole('button', {name: '텍스트 모델 받는 중 · 80%'})).toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80')
})

it('should render and dismiss model download errors', () => {
  setState({message: '다운로드 실패', status: 'error'})
  const {container} = render(() => <PModelDownloadStatus />)

  expect(screen.getByRole('alert')).toHaveClass('text-sm')
  expect(screen.getByRole('alert')).toHaveTextContent('다운로드 실패')
  expect(container.querySelector('.i-tabler-alert-circle')).toHaveClass('size-4.5')
  fireEvent.click(screen.getByRole('button', {name: '닫기'}))
  expect(dismissError).toHaveBeenCalledOnce()
})
