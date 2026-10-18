/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {Transfer} from '../Transfer'

vi.mock('src/features/file-transfer/session', async () => {
  const {createMutable} = await import('solid-js/store')
  const state = createMutable({
    error: null,
    incoming: null,
    joinUrl: null,
    outgoing: null,
    phase: 'connecting',
  })
  return {
    fileTransfer: {
      approve: vi.fn(),
      cancel: vi.fn(),
      create: vi.fn(),
      get isActive() {
        return state.phase !== 'idle' && state.phase !== 'error'
      },
      isConfigured: true,
      state,
    },
  }
})
vi.mock('../ReceivedFiles', () => ({ReceivedFiles: vi.fn()}))

beforeEach(() => {
  Object.assign(fileTransfer.state, {
    error: null,
    errorCode: null,
    joinUrl: null,
    phase: 'connecting',
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Transfer connection controls', () => {
  it('should retain failure guidance when the connecting dialog closes after failure', () => {
    Object.assign(fileTransfer.state, {
      joinUrl: 'http://localhost:3300/?tool=transfer&session=test#secret',
    })
    render(() => <Transfer />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: m.transfer_joining()})).toBeDisabled()
    Object.assign(fileTransfer.state, {
      error: m.transfer_error_direct_connection(),
      errorCode: 'direct-connection',
      phase: 'error',
    })
    expect(screen.getByRole('dialog')).toHaveAttribute('data-closed')
    expect(screen.getByRole('alert')).toHaveTextContent(m.transfer_error_direct_connection())
    expect(screen.getByText(m.transfer_connection_help())).toBeInTheDocument()
    expect(fileTransfer.cancel).not.toHaveBeenCalled()
  })
  it('should offer collapsed permission guidance only after a direct connection failure', () => {
    Object.assign(fileTransfer.state, {
      error: m.transfer_error_direct_connection(),
      errorCode: 'direct-connection',
      phase: 'error',
    })
    render(() => <Transfer />)
    const guidance = screen.getByText(m.transfer_connection_help()).closest('details')
    expect(guidance).not.toHaveAttribute('open')
    expect(screen.getByRole('alert')).toHaveTextContent(m.transfer_error_direct_connection())
    expect(screen.getByText(m.transfer_connection_help_retry())).toBeInTheDocument()
  })

  it('should not display permission guidance while connecting', () => {
    render(() => <Transfer />)
    expect(screen.queryByText(m.transfer_connection_help())).not.toBeInTheDocument()
  })
  it('should let an invited peer cancel while waiting for approval', () => {
    render(() => <Transfer />)
    fireEvent.click(screen.getByRole('button', {name: m.transfer_cancel()}))
    expect(fileTransfer.cancel).toHaveBeenCalledOnce()
  })

  it.each(['idle', 'error'] as const)(
    'should hide disconnect controls in the %s state',
    (phase) => {
      Object.assign(fileTransfer.state, {phase})
      render(() => <Transfer />)
      expect(screen.queryByRole('button', {name: m.transfer_cancel()})).not.toBeInTheDocument()
    },
  )
})
