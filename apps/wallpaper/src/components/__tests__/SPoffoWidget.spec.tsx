/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow, PhysicalPosition, PhysicalSize} from '@tauri-apps/api/window'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {useWidget} from '../../features/poffo/use-widget'
import {SPoffoWidget} from '../SPoffoWidget'

vi.mock('../../features/poffo/use-widget', () => ({useWidget: vi.fn()}))
vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/window', async () => {
  const actual =
    await vi.importActual<typeof import('@tauri-apps/api/window')>('@tauri-apps/api/window')
  return {...actual, getCurrentWindow: vi.fn()}
})
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const setup = () => {
  const window = {
    innerSize: vi.fn().mockResolvedValue(new PhysicalSize(640, 840)),
    onResized: vi.fn().mockResolvedValue(vi.fn()),
    outerPosition: vi.fn().mockResolvedValue(new PhysicalPosition(10, 20)),
    scaleFactor: vi.fn().mockResolvedValue(2),
    setPosition: vi.fn().mockResolvedValue(undefined),
    setResizable: vi.fn().mockResolvedValue(undefined),
    setSize: vi.fn().mockResolvedValue(undefined),
    startResizeDragging: vi.fn().mockResolvedValue(undefined),
  }
  const controller = {
    agentBindings: () => undefined,
    assetId: () => null,
    drag: vi.fn(),
    error: () => null,
    lipsync: () => undefined,
    load: vi.fn(),
    motionId: () => undefined,
    report: vi.fn(),
    saveSize: vi.fn().mockResolvedValue(undefined),
    tracking: () => undefined,
    trackingBindings: () => undefined,
    trackingOptions: () => undefined,
  }
  vi.mocked(useWidget).mockReturnValue(controller)
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(false)
  vi.mocked(getCurrentWindow).mockReturnValue(
    window as unknown as ReturnType<typeof getCurrentWindow>,
  )
  render(() => <SPoffoWidget id="character" />)
  return {controller, window}
}

it('should resize through the context menu and handles without showing a close button', async () => {
  const {controller, window} = setup()
  const widget = screen.getByRole('main', {name: 'Poffo 위젯'})
  expect(screen.queryByRole('button', {name: 'Poffo 위젯 닫기'})).toBeNull()
  expect(screen.queryByRole('group', {name: '위젯 크기 조정'})).toBeNull()
  fireEvent.contextMenu(widget, {clientX: 100, clientY: 150})
  expect(screen.queryByRole('menu')).toBeNull()
  fireEvent(
    widget,
    new MouseEvent('pointerup', {bubbles: true, button: 2, clientX: 100, clientY: 150}),
  )
  fireEvent.click(screen.getByRole('menuitem', {name: '크기 조정'}))
  await waitFor(() => expect(screen.getByRole('group', {name: '위젯 크기 조정'})).toBeVisible())
  expect(screen.getAllByRole('button', {name: /크기 조정$/})).toHaveLength(8)
  fireEvent(
    screen.getByRole('button', {name: '오른쪽 아래 크기 조정'}),
    new MouseEvent('pointerdown', {bubbles: true, button: 0}),
  )
  await waitFor(() => expect(window.startResizeDragging).toHaveBeenCalledWith('SouthEast'))
  expect(controller.drag).not.toHaveBeenCalled()
  expect(controller.saveSize).not.toHaveBeenCalled()
  window.innerSize.mockResolvedValue(new PhysicalSize(960, 1260))
  fireEvent.click(screen.getByRole('button', {name: '조정 완료'}))
  fireEvent(widget, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
  expect(controller.drag).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('group', {name: '위젯 크기 조정'})).toBeNull())
  expect(controller.saveSize).toHaveBeenCalledWith({height: 630, width: 480})
  expect(window.setResizable).toHaveBeenLastCalledWith(false)
})

it('should offer completion in the context menu while editing and cancel with Escape', async () => {
  const {controller, window} = setup()
  const widget = screen.getByRole('main', {name: 'Poffo 위젯'})
  fireEvent.keyDown(widget, {key: 'F10', shiftKey: true})
  fireEvent.click(screen.getByRole('menuitem', {name: '크기 조정'}))
  await waitFor(() => expect(screen.getByRole('group', {name: '위젯 크기 조정'})).toBeVisible())
  fireEvent(widget, new MouseEvent('pointerup', {bubbles: true, button: 2}))
  expect(screen.getByRole('menuitem', {name: '조정 완료'})).toBeVisible()
  fireEvent.keyDown(screen.getByRole('menu', {name: 'Poffo 위젯 메뉴'}), {key: 'Escape'})
  expect(screen.queryByRole('menu')).toBeNull()
  expect(screen.getByRole('group', {name: '위젯 크기 조정'})).toBeVisible()
  fireEvent.keyDown(widget, {key: 'Escape'})
  await waitFor(() => expect(screen.queryByRole('group', {name: '위젯 크기 조정'})).toBeNull())
  expect(window.setPosition).toHaveBeenCalledWith(new PhysicalPosition(10, 20))
  expect(controller.saveSize).not.toHaveBeenCalled()
})

it('should move the character while keeping resize handles active and block movement under a menu', async () => {
  const {controller, window} = setup()
  const widget = screen.getByRole('main', {name: 'Poffo 위젯'})
  fireEvent.keyDown(widget, {key: 'F10', shiftKey: true})
  fireEvent.click(screen.getByRole('menuitem', {name: '크기 조정'}))
  await waitFor(() => expect(screen.getByRole('group', {name: '위젯 크기 조정'})).toBeVisible())
  fireEvent(widget, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
  expect(controller.drag).toHaveBeenCalledOnce()
  expect(screen.getByRole('group', {name: '위젯 크기 조정'})).toBeVisible()
  expect(window.startResizeDragging).not.toHaveBeenCalled()
  fireEvent(
    screen.getByRole('button', {name: '오른쪽 아래 크기 조정'}),
    new MouseEvent('pointerdown', {bubbles: true, button: 0}),
  )
  await waitFor(() => expect(window.startResizeDragging).toHaveBeenCalledWith('SouthEast'))
  expect(controller.drag).toHaveBeenCalledOnce()
  fireEvent(widget, new MouseEvent('pointerup', {bubbles: true, button: 2}))
  fireEvent(widget, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
  expect(controller.drag).toHaveBeenCalledOnce()
})
