/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {createReceivedFiles} from 'src/features/file-transfer/received-files'
import {createTransferSession} from 'src/features/file-transfer/create-session'
import {TransferFileRequest} from '../TransferFileRequest'

vi.mock('src/features/file-transfer/received-files', () => ({createReceivedFiles: vi.fn()}))
vi.mock('src/features/file-transfer/create-session', () => ({createTransferSession: vi.fn()}))

// Capture cold-import construction before per-test mock cleanup can erase those calls.
const constructionDuringImport = {
  receivedFiles: vi.mocked(createReceivedFiles).mock.calls.length,
  transferSession: vi.mocked(createTransferSession).mock.calls.length,
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should format changing offer metadata and actions without initializing transfer stores', () => {
  const [file, setFile] = createSignal({name: 'offer.bin', size: 2_200_000})
  const onAccept = vi.fn()
  const onReject = vi.fn()
  const megabytes = 2.2
  const kilobytes = 999.999
  const expectedMegabytes = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'unit',
    unit: 'megabyte',
  }).format(megabytes)
  const expectedKilobytes = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'unit',
    unit: 'kilobyte',
  }).format(kilobytes)
  render(() => (
    <TransferFileRequest file={file()} mode="incoming" onAccept={onAccept} onReject={onReject} />
  ))
  const accept = screen.getByRole('button', {name: m.transfer_accept()})
  expect(screen.getByText((_, element) => element?.textContent === expectedMegabytes)).toBeVisible()

  setFile({name: 'updated.bin', size: 999_999})

  expect(screen.getByText('updated.bin')).toBeVisible()
  expect(screen.getByText((_, element) => element?.textContent === expectedKilobytes)).toBeVisible()
  expect(screen.getByRole('button', {name: m.transfer_accept()})).toBe(accept)
  fireEvent.click(accept)
  fireEvent.click(screen.getByRole('button', {name: m.transfer_reject()}))
  expect(onAccept).toHaveBeenCalledOnce()
  expect(onReject).toHaveBeenCalledOnce()
  expect(constructionDuringImport).toEqual({receivedFiles: 0, transferSession: 0})
  expect(createReceivedFiles).not.toHaveBeenCalled()
  expect(createTransferSession).not.toHaveBeenCalled()
})
