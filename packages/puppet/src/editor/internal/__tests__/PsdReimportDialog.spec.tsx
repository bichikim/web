/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import type {ImportPsdResult} from '../../import-psd'
import {type PsdReimportController, usePsdReimport} from '../../use-psd-reimport'
import {PsdReimportDialog} from '../PsdReimportDialog'

test('should keep additions opt-in and apply the count shown in the review', async () => {
  const document = createDemoDocument()
  const onDocumentChange = vi.fn()
  let controller!: PsdReimportController
  render(() => {
    controller = usePsdReimport({
      document: () => document,
      onDocumentChange,
      onNotice: vi.fn(),
      readPsd: async () => ({document, ok: true, warnings: ['레이어 확인 안내']}),
    })
    return <PsdReimportDialog controller={controller} />
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await controller.load(new File([], 'model.psd'))
  expect(screen.getByRole('dialog', {name: 'PSD 재가져오기'})).toBeVisible()
  expect(screen.getByText('model.psd')).toBeVisible()
  expect(screen.getByText('레이어 확인 안내')).toBeVisible()
  expect(screen.getByRole('button', {name: '적용 0개'})).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', {name: '새 레이어도 추가'}))
  fireEvent.click(screen.getByRole('button', {name: '적용 3개'}))
  expect(onDocumentChange).toHaveBeenCalledOnce()
  expect(onDocumentChange.mock.calls[0][0].parts).toHaveLength(6)
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed'))
})

test('should allow dismissal while loading and display a read failure without enabling apply', async () => {
  const document = createDemoDocument()
  let resolveRead!: (result: ImportPsdResult) => void
  const pending = new Promise<ImportPsdResult>((resolve) => {
    resolveRead = resolve
  })
  const readPsd = vi.fn<() => Promise<ImportPsdResult>>().mockReturnValueOnce(pending)
  readPsd.mockRejectedValueOnce(new Error('read failed'))
  const onDocumentChange = vi.fn()
  let controller!: PsdReimportController
  render(() => {
    controller = usePsdReimport({
      document: () => document,
      onDocumentChange,
      onNotice: vi.fn(),
      readPsd,
    })
    return <PsdReimportDialog controller={controller} />
  })
  const loading = controller.load(new File([], 'model.psd'))
  expect(screen.getByRole('status')).toHaveTextContent('레이어를 비교하는 중')
  expect(screen.getByRole('button', {name: '적용 0개'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '취소'}))
  resolveRead({document, ok: true, warnings: []})
  await loading
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed'))
  await controller.load(new File([], 'broken.psd'))
  expect(screen.getByRole('alert')).toHaveTextContent('PSD를 읽지 못했습니다.')
  expect(screen.getByRole('button', {name: '적용 0개'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '재가져오기 닫기'}))
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-closed'))
  expect(onDocumentChange).not.toHaveBeenCalled()
})
