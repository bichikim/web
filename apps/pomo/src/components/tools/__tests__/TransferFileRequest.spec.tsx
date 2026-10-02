/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {TransferFileRequest} from '../TransferFileRequest'

afterEach(cleanup)
const file = {name: '사진.png', size: 2_200_000}

describe('TransferFileRequest', () => {
  it('should describe the requested file and let the user accept or decline it', () => {
    const onAccept = vi.fn()
    const onReject = vi.fn()
    render(() => (
      <TransferFileRequest file={file} mode="incoming" onAccept={onAccept} onReject={onReject} />
    ))
    expect(screen.getByText(file.name)).toBeVisible()
    expect(screen.getByText(/2\.2\s*MB/u)).toBeVisible()
    expect(screen.getByText(m.transfer_incoming_description())).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name: m.transfer_accept()}))
    fireEvent.click(screen.getByRole('button', {name: m.transfer_reject()}))
    expect(onAccept).toHaveBeenCalledOnce()
    expect(onReject).toHaveBeenCalledOnce()
  })

  it('should identify the outgoing file while waiting without showing receiving actions', () => {
    render(() => <TransferFileRequest file={file} mode="outgoing" />)
    expect(screen.getByRole('status')).toHaveTextContent(m.transfer_offer_pending())
    expect(screen.getByText(file.name)).toBeVisible()
    expect(screen.getByText(m.transfer_outgoing_description())).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
