/** @vitest-environment jsdom */
import {Show} from 'solid-js'
import {createStore} from 'solid-js/store'
import {render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PModal, type PModalProps} from '../../p-modal/PModal'
import {toolsDialog} from '../dialog'
import {PToolsDialog} from '../PToolsDialog'

const mocks = vi.hoisted(() => ({
  isConfigured: true,
  join: vi.fn(),
  location: {hash: '', pathname: '/', search: ''},
  navigate: vi.fn(),
}))
const [location, setLocation] = createStore(mocks.location)
vi.mock('@solidjs/router', () => ({
  useLocation: () => location,
  useNavigate: () => mocks.navigate,
}))
vi.mock('src/features/file-transfer/session', () => ({
  fileTransfer: {
    isActive: false,
    get isConfigured() {
      return mocks.isConfigured
    },
    join: mocks.join,
  },
}))
vi.mock('../../p-modal/PModal', () => ({
  PModal: vi.fn((props: PModalProps) => <Show when={props.isOpen}>{props.children}</Show>),
}))
vi.mock('../../tools/Content', () => ({
  Content: (props: {readonly selected?: string}) => <p>{props.selected}</p>,
}))
beforeEach(() => {
  setLocation({hash: '', pathname: '/', search: ''})
  mocks.isConfigured = true
  mocks.join.mockReset()
  mocks.navigate.mockReset()
  toolsDialog.onOpenChange(false)
})
afterEach(() => vi.clearAllMocks())

it('should join a QR invitation inside the regular tools modal and remove invitation details', async () => {
  setLocation({hash: '#secret', search: '?tool=transfer&session=invitation&other=kept'})
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
  setLocation('search', '?tool=transfer')
  render(() => <PToolsDialog />)

  expect(vi.mocked(PModal).mock.calls[0]?.[0].isOpen).toBe(true)
  expect(mocks.join).not.toHaveBeenCalled()
})

it('should pass a missing invitation secret to the connection error handler', () => {
  setLocation('search', '?tool=transfer&session=invitation')
  render(() => <PToolsDialog />)

  expect(mocks.join).toHaveBeenCalledExactlyOnceWith('invitation', '')
  expect(vi.mocked(PModal).mock.calls[0]?.[0].isOpen).toBe(true)
})

it('should ignore an unconfigured transfer link without consuming its URL', () => {
  mocks.isConfigured = false
  setLocation({hash: '#example', search: '?tool=transfer&session=invitation'})
  render(() => <PToolsDialog />)

  expect(toolsDialog.isOpen()).toBe(false)
  expect(mocks.join).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
})

it('should leave navigation after join so a synchronous connection failure preserves the URL', () => {
  const failure = new Error('Example connection failure')
  mocks.join.mockImplementation(() => {
    throw failure
  })
  setLocation({hash: '#example', search: '?tool=transfer&session=invitation'})

  expect(() => render(() => <PToolsDialog />)).toThrow(failure)
  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(location.search).toBe('?tool=transfer&session=invitation')
})

it('should consume a reactive invitation once and handle a later invitation', () => {
  mocks.navigate.mockImplementation((url: string) => {
    const target = new URL(url, 'https://example.test')
    setLocation({hash: target.hash, pathname: target.pathname, search: target.search})
  })
  setLocation({
    hash: '#example%2Ffragment',
    pathname: '/tools',
    search: '?tool=transfer&session=first&tool=other&session=second&keep=a&keep=b',
  })
  render(() => <PToolsDialog />)

  expect(mocks.join).toHaveBeenCalledExactlyOnceWith('first', 'example%2Ffragment')
  expect(location.search).toBe('?keep=a&keep=b')
  expect(location.hash).toBe('')
  toolsDialog.onOpenChange(false)
  expect(mocks.join).toHaveBeenCalledTimes(1)

  setLocation({hash: '#later-example', search: '?tool=transfer&session=later'})
  expect(mocks.join).toHaveBeenCalledTimes(2)
  expect(mocks.join).toHaveBeenLastCalledWith('later', 'later-example')
  expect(mocks.navigate).toHaveBeenLastCalledWith('/tools', {replace: true, scroll: false})
})

it('should retain the fragment when consuming a reactive tool-only link', () => {
  mocks.navigate.mockImplementation((url: string) => {
    const target = new URL(url, 'https://example.test')
    setLocation({hash: target.hash, pathname: target.pathname, search: target.search})
  })
  setLocation({hash: '#example', search: '?tool=transfer&keep=value'})
  render(() => <PToolsDialog />)

  expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith('/?keep=value#example', {
    replace: true,
    scroll: false,
  })
  expect(location.hash).toBe('#example')
  expect(mocks.join).not.toHaveBeenCalled()
})
