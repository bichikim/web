import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {Transfer} from '../Transfer'

// Only signaling is controlled; the actual session and UI use native WebRTC.
class Socket extends EventTarget {
  static instances: Socket[] = []
  readyState = 1
  readonly close = vi.fn(() => {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  })
  readonly send = vi.fn((raw: string) => {
    const message = JSON.parse(raw) as {type: string}
    if (message.type === 'approve') {
      this.message({type: 'approved'})
    }
  })
  constructor() {
    super()
    Socket.instances.push(this)
  }
  message(value: unknown) {
    this.dispatchEvent(new MessageEvent('message', {data: JSON.stringify(value)}))
  }
}

let peers: RTCPeerConnection[] = []
let channel: RTCDataChannel | undefined

beforeEach(() => {
  Socket.instances = []
  peers = []
  channel = undefined
  vi.stubGlobal('WebSocket', Socket)
  vi.spyOn(RTCPeerConnection.prototype, 'close')
  const createChannel = RTCPeerConnection.prototype.createDataChannel
  vi.spyOn(RTCPeerConnection.prototype, 'createDataChannel').mockImplementation(
    function captureChannel(this: RTCPeerConnection, label, options) {
      peers.push(this)
      channel = createChannel.call(this, label, options)
      return channel
    },
  )
})

afterEach(async () => {
  cleanup()
  // create also releases an interrupted connection, including during a failing RED run.
  await fileTransfer.create()
  fileTransfer.cancel()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should close the connecting invitation and release native resources before retry', async () => {
  render(() => createComponent(Transfer, {}))
  await page.getByRole('button', {name: m.transfer_create()}).click()
  const [socket] = Socket.instances
  socket.message({id: 'invitation', joinerSecret: 'secret', type: 'created'})
  socket.message({type: 'join-request'})
  await page.getByRole('button', {name: m.transfer_approve()}).click()
  expect(channel).toBeInstanceOf(RTCDataChannel)
  expect(channel?.readyState).toBe('connecting')
  expect(fileTransfer.state.phase).toBe('connecting')

  await page.getByRole('button', {exact: true, name: m.common_close()}).click()
  expect(fileTransfer.state.phase).toBe('idle')
  expect(fileTransfer.isActive).toBe(false)
  expect(peers[0]?.connectionState).toBe('closed')
  expect(channel?.readyState).not.toBe('connecting')
  expect(socket.close).toHaveBeenCalledOnce()
  expect(RTCPeerConnection.prototype.close).toHaveBeenCalledOnce()
  await expect.element(page.getByRole('button', {name: m.transfer_create()})).toBeVisible()
  await page.getByRole('button', {name: m.transfer_create()}).click()
  expect(fileTransfer.state.phase).toBe('creating')
  expect(Socket.instances).toHaveLength(2)
})

it('should cancel an invited peer from the connecting transfer panel', async () => {
  fileTransfer.join('invitation', 'secret')
  render(() => createComponent(Transfer, {}))
  const [socket] = Socket.instances
  socket.message({type: 'approved'})
  expect(fileTransfer.state.phase).toBe('connecting')
  await page.getByRole('button', {name: m.transfer_cancel()}).click()
  expect(fileTransfer.state.phase).toBe('idle')
  expect(socket.close).toHaveBeenCalledOnce()
  expect(RTCPeerConnection.prototype.close).toHaveBeenCalledOnce()
  await expect.element(page.getByRole('button', {name: m.transfer_create()})).toBeVisible()
})
