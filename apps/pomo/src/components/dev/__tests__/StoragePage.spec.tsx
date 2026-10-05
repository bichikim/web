import {createDeferred} from 'src/test-utils/create-deferred'
/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/p-modal/PModal'
import {type ModelDownloadState, useModelDownload} from 'src/features/model-download'
import type {ModelStorageManager} from 'src/features/model-storage'
import {failureResult, successResult} from 'src/features/result'
import {StoragePage} from '../StoragePage'
import {DeletionModal} from '../storage/DeletionModal'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('../storage/DeletionModal', async (importOriginal) => {
  const original = await importOriginal<typeof import('../storage/DeletionModal')>()
  return {DeletionModal: vi.fn(original.DeletionModal)}
})

let setDownloadState: (value: ModelDownloadState) => ModelDownloadState

const createManager = (): ModelStorageManager => ({
  clearCache: vi.fn(async () => successResult(true)),
  clearPartialDownloads: vi.fn(async () => successResult(true)),
  deleteCacheEntry: vi.fn(async () => successResult(true)),
  inspect: vi.fn(async () =>
    successResult({
      cacheEntries: ['https://models.test/repository/model.onnx'],
      partialFileCount: 2,
      partialStorageAvailable: true,
    }),
  ),
})

beforeEach(() => {
  const [downloadState, updateDownloadState] = createSignal<ModelDownloadState>({status: 'idle'})
  setDownloadState = updateDownloadState
  vi.mocked(useModelDownload).mockReturnValue({state: downloadState} as ReturnType<
    typeof useModelDownload
  >)
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should show partial storage loading until the first inspection completes', async () => {
  const manager = createManager()
  const inspection = createDeferred<Awaited<ReturnType<ModelStorageManager['inspect']>>>()
  vi.mocked(manager.inspect).mockReturnValue(inspection.promise)

  render(() => <StoragePage manager={manager} />)

  expect(screen.getAllByText('조회 중…')).toHaveLength(2)
  expect(screen.queryByText('0개 파일이 남아 있어요.')).not.toBeInTheDocument()

  inspection.resolve(
    successResult({cacheEntries: [], partialFileCount: 0, partialStorageAvailable: true}),
  )
  expect(await screen.findByText('0개 파일이 남아 있어요.')).toBeInTheDocument()
})

it('should confirm, delete a cache entry, and refresh the snapshot', async () => {
  const manager = createManager()
  render(() => <StoragePage manager={manager} />)

  const deleteButton = await screen.findByRole('button', {name: 'model.onnx 삭제'})
  fireEvent.click(deleteButton)
  expect(screen.getByRole('dialog', {name: '모델 데이터 삭제'})).toHaveTextContent(
    'model.onnx 파일을 삭제할까요?',
  )
  fireEvent.click(screen.getByRole('button', {name: '삭제 확정'}))

  await waitFor(() =>
    expect(manager.deleteCacheEntry).toHaveBeenCalledWith(
      'https://models.test/repository/model.onnx',
    ),
  )
  await waitFor(() => expect(manager.inspect).toHaveBeenCalledTimes(2))
})

it('should preserve data when deletion confirmation is cancelled', async () => {
  const manager = createManager()
  render(() => <StoragePage manager={manager} />)

  const deleteButton = await screen.findByRole('button', {name: 'model.onnx 삭제'})
  fireEvent.click(deleteButton)
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  vi.mocked(PModal).mock.calls[0]?.[0].onCloseAutoFocus?.()

  expect(manager.deleteCacheEntry).not.toHaveBeenCalled()
  expect(deleteButton).toHaveFocus()
})

it('should report inspection failures', async () => {
  const manager = createManager()
  vi.mocked(manager.inspect).mockResolvedValue(
    failureResult({cause: new Error('blocked'), operation: 'inspect'}),
  )
  render(() => <StoragePage manager={manager} />)

  expect(await screen.findByRole('alert')).toHaveTextContent('모델 저장소를 읽지 못했어요.')
})

it('should block deletion while a model download is active', async () => {
  const manager = createManager()
  render(() => <StoragePage manager={manager} />)
  const deleteButton = await screen.findByRole('button', {name: 'model.onnx 삭제'})
  fireEvent.click(deleteButton)

  setDownloadState({
    label: 'Gemma 4 E2B',
    percentage: 25,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })

  expect(screen.getByRole('status')).toHaveTextContent(
    '모델 다운로드 중에는 저장소를 삭제할 수 없어요.',
  )
  expect(screen.getByRole('button', {name: '삭제 확정'})).toBeDisabled()
  const confirmButton = screen.getByRole('button', {name: '삭제 확정'})
  fireEvent.click(confirmButton)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(manager.deleteCacheEntry).not.toHaveBeenCalled()

  // Verify the deletion callback also rejects a request after downloading starts.
  vi.mocked(DeletionModal).mock.calls[0]?.[0].onConfirm()
  expect(screen.getByRole('alert')).toHaveTextContent(
    '모델 다운로드가 끝나거나 취소된 뒤 저장소를 삭제해 주세요.',
  )
  expect(manager.deleteCacheEntry).not.toHaveBeenCalled()
})

it('should render its development page content', () => {
  render(() => <StoragePage />)
  expect(screen.getAllByText('모델 저장소 관리', {exact: false}).length).toBeGreaterThan(0)
})
