/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {copyToolResult} from 'src/features/tools'
import {TransferConnectionInfo} from '../TransferConnectionInfo'

vi.mock('src/features/tools', () => ({copyToolResult: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const url = 'http://localhost:3300/?tool=transfer&session=invitation#secret'

describe('TransferConnectionInfo', () => {
  it('should display the invitation as a QR code, selectable address, and waiting status', () => {
    render(() => <TransferConnectionInfo url={url} waiting />)
    expect(screen.getByRole('img', {name: m.transfer_qr()})).toBeVisible()
    expect(screen.getByRole('textbox', {name: m.transfer_copy()})).toHaveValue(url)
    expect(screen.getByRole('textbox', {name: m.transfer_copy()})).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent(m.transfer_waiting())
  })

  it('should temporarily change the copy button label and restore it on feedback completion', async () => {
    vi.mocked(copyToolResult).mockResolvedValue(true)
    render(() => <TransferConnectionInfo url={url} />)
    fireEvent.click(screen.getByRole('button', {name: m.transfer_copy()}))
    expect(await screen.findByRole('button', {name: m.tools_copied()})).toBeVisible()
    expect(copyToolResult).toHaveBeenCalledExactlyOnceWith(url)
    fireEvent.animationEnd(screen.getByText(m.tools_copied()))
    expect(screen.getByRole('button', {name: m.transfer_copy()})).toBeVisible()
  })

  it('should show approval controls only when approval is requested', () => {
    const onApprove = vi.fn()
    render(() => <TransferConnectionInfo url={url} onApprove={onApprove} />)
    fireEvent.click(screen.getByRole('button', {name: m.transfer_approve()}))
    expect(onApprove).toHaveBeenCalledOnce()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
