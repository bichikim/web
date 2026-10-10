/** @vitest-environment jsdom */

import {beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {createTransferSession} from '../features/file-transfer/create-session'

class Socket extends EventTarget {
  static instances: Socket[] = []
  readyState = 1
  send = vi.fn()
  close = vi.fn()
  constructor() {
    super()
    Socket.instances.push(this)
  }
}

beforeEach(() => {
  Socket.instances = []
})

it('should treat an empty session id as an invalid transfer invitation', () => {
  const fileTransfer = createTransferSession({
    createConnection: vi.fn(),
    createId: () => 'outgoing-id',
    createSocket: () => new Socket() as unknown as WebSocket,
    getOrigin: () => 'http://localhost:3300',
    receivedFiles: {add: vi.fn(), save: vi.fn(), state: {files: []}},
  })

  fileTransfer.join('', 'invitation-secret')

  expect(fileTransfer.state.phase).toBe('error')
  expect(fileTransfer.state.error).toBe(m.transfer_error_invalid_link())
  expect(Socket.instances).toHaveLength(0)
})
