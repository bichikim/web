/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {Transfer} from '../Transfer'

vi.mock('src/features/file-transfer/session', () => ({
  fileTransfer: {
    cancel: vi.fn(),
    create: vi.fn(),
    isActive: true,
    isConfigured: true,
    state: {error: null, incoming: null, joinUrl: null, outgoing: null, phase: 'connecting'},
  },
}))
vi.mock('../ReceivedFiles', () => ({ReceivedFiles: vi.fn()}))

beforeEach(() => {
  Object.assign(fileTransfer.state, {phase: 'connecting'})
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Transfer connection controls', () => {
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
