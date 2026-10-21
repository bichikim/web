import {createMemoryHistory, MemoryRouter} from '@solidjs/router'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {PToolsDialog} from '../PToolsDialog'
import {toolsDialog} from '../dialog'

const transport = vi.hoisted(() => ({createConnection: vi.fn(), createSocket: vi.fn()}))
vi.mock('src/features/file-transfer/session', async () => {
  const {createTransferSession} = await import('src/features/file-transfer/create-session')
  const {createReceivedFiles} = await import('src/features/file-transfer/received-files')
  const receivedFiles = createReceivedFiles()
  return {
    fileTransfer: createTransferSession({
      createConnection: () => transport.createConnection(),
      createId: () => 'outgoing-id',
      createSocket: (url) => transport.createSocket(url),
      getOrigin: () => 'http://localhost:3300',
      receivedFiles,
    }),
    receivedFiles,
  }
})
vi.mock('../../tools/Content', async () => {
  const {Transfer} = await import('../../tools/Transfer')
  return {Content: Transfer}
})

class Socket extends EventTarget {
  readyState = 1
  readonly close = vi.fn()
  readonly send = vi.fn()
}

beforeEach(() => {
  fileTransfer.cancel()
  toolsDialog.onOpenChange(false)
  toolsDialog.onSelectedChange('units')
  transport.createSocket.mockImplementation(() => new Socket())
})
afterEach(() => {
  cleanup()
  fileTransfer.cancel()
  toolsDialog.onOpenChange(false)
  vi.clearAllMocks()
})

const openLink = (value: string) => {
  const history = createMemoryHistory()
  history.set({replace: true, scroll: false, value})
  render(() => createComponent(MemoryRouter, {history, root: PToolsDialog}))
  return history
}

it.each(['/?tool=transfer&session#secret', '/?tool=transfer&session=#secret'])(
  'should display invalid-link guidance for %s without opening transport',
  async (link) => {
    const history = openLink(link)
    await expect.poll(() => fileTransfer.state.phase).toBe('error')
    await expect.element(page.getByRole('alert')).toHaveTextContent(m.transfer_error_invalid_link())
    expect(toolsDialog.selected()).toBe('transfer')
    expect(transport.createSocket).not.toHaveBeenCalled()
    expect(transport.createConnection).not.toHaveBeenCalled()
    expect(history.get()).toBe('/')
  },
)

it('should keep a missing session available for creating a transfer', async () => {
  const history = openLink('/?tool=transfer#preserved-fragment')
  await expect.element(page.getByRole('button', {name: m.transfer_create()})).toBeVisible()
  expect(fileTransfer.state.phase).toBe('idle')
  expect(toolsDialog.selected()).toBe('transfer')
  expect(transport.createSocket).not.toHaveBeenCalled()
  expect(history.get()).toBe('/#preserved-fragment')
})

it('should preserve a valid invitation and clear its consumed secret', async () => {
  const history = openLink('/?tool=transfer&session=invitation#secret')
  await expect.element(page.getByRole('status')).toHaveTextContent(m.transfer_joining())
  expect(fileTransfer.state.phase).toBe('connecting')
  expect(transport.createSocket).toHaveBeenCalledExactlyOnceWith(
    'ws://localhost:3300/api/transfer/socket',
  )
  const socket = transport.createSocket.mock.results[0].value as Socket
  socket.dispatchEvent(new Event('open'))
  expect(socket.send).toHaveBeenCalledExactlyOnceWith(
    JSON.stringify({id: 'invitation', secret: 'secret', type: 'join'}),
  )
  expect(history.get()).toBe('/')
})
