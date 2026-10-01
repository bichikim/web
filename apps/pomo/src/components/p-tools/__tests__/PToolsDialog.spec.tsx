/** @vitest-environment jsdom */
import {Show} from 'solid-js'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PModal, type PModalProps} from '../../p-modal/PModal'
import {toolsDialog} from '../dialog'
import {PToolsDialog} from '../PToolsDialog'

const mocks = vi.hoisted(() => ({
  join: vi.fn(),
  location: {hash: '', pathname: '/', search: ''},
  navigate: vi.fn(),
}))
vi.mock('@solidjs/router', () => ({
  useLocation: () => mocks.location,
  useNavigate: () => mocks.navigate,
}))
vi.mock('src/features/file-transfer/session', () => ({
  fileTransfer: {isActive: false, isConfigured: true, join: mocks.join},
}))
vi.mock('../../p-modal/PModal', () => ({
  PModal: vi.fn((props: PModalProps) => <Show when={props.isOpen}>{props.children}</Show>),
}))
vi.mock('../../tools/Content', () => ({
  Content: (props: {readonly selected?: string}) => <p>{props.selected}</p>,
}))
beforeEach(() => {
  mocks.location.hash = ''
  mocks.location.search = ''
  toolsDialog.onOpenChange(false)
})
afterEach(() => vi.clearAllMocks())

it('should join a QR invitation inside the regular tools modal and remove invitation details', async () => {
  mocks.location.search = '?tool=transfer&session=invitation&other=kept'
  mocks.location.hash = '#secret'
  render(() => <PToolsDialog />)

  const modalProps = vi.mocked(PModal).mock.calls[0]?.[0]
  expect(modalProps?.isOpen).toBe(true)
  expect(await screen.findByText('transfer')).toBeVisible()
  expect(mocks.join).toHaveBeenCalledExactlyOnceWith('invitation', 'secret')
  expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/?other=kept', {
    replace: true,
    scroll: false,
  })

  modalProps?.onOpenChange(false)
  toolsDialog.open()
  expect(mocks.join).toHaveBeenCalledTimes(1)
})

it('should open the transfer tool without joining when no invitation is supplied', () => {
  mocks.location.search = '?tool=transfer'
  render(() => <PToolsDialog />)

  expect(vi.mocked(PModal).mock.calls[0]?.[0].isOpen).toBe(true)
  expect(mocks.join).not.toHaveBeenCalled()
})

it('should pass a missing invitation secret to the connection error handler', () => {
  mocks.location.search = '?tool=transfer&session=invitation'
  render(() => <PToolsDialog />)

  expect(mocks.join).toHaveBeenCalledExactlyOnceWith('invitation', '')
  expect(vi.mocked(PModal).mock.calls[0]?.[0].isOpen).toBe(true)
})
