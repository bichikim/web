/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {TAROT_CARDS} from '../../../features/tarot'
import {TarotCardView} from '../TarotCardView'

const renderer = vi.hoisted(() => ({
  destroy: vi.fn(),
  initialize: vi.fn<(options: {marker: string; name: string}) => Promise<boolean>>(),
  render: vi.fn<(frame: {reversed: boolean}) => void>(),
}))

vi.mock('src/features/tarot-depth', () => ({
  TarotDepthRenderer: class {
    destroy = renderer.destroy
    initialize = renderer.initialize
    render = renderer.render
  },
}))

const observer = {disconnect: vi.fn(), observe: vi.fn()}

beforeEach(() => {
  vi.clearAllMocks()
  renderer.initialize.mockResolvedValue(true)
  const preference = new EventTarget()
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: preference.addEventListener.bind(preference),
    matches: true,
    removeEventListener: preference.removeEventListener.bind(preference),
  }))
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = observer.disconnect
      observe = observer.observe
    },
  )
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }),
  })
})

afterEach(async () => {
  // The real clientOnly import must finish while the test environment still exists.
  await vi.dynamicImportSettled()
  cleanup()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
})

it('should pass the selected card and view direction to depth rendering and release it on close', async () => {
  render(() => (
    <TarotCardView
      card={{...TAROT_CARDS[0]!, orientation: 'reversed'}}
      locale="ko"
      showUpright={false}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '광대 크게 보기'}))
  await vi.dynamicImportSettled()
  const dialog = screen.getByRole('dialog', {name: '광대'})
  const surface = within(dialog).getByRole('group', {name: '광대'})
  expect(renderer.initialize).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({marker: '0', name: '광대'}),
  )
  expect(renderer.render).toHaveBeenLastCalledWith(expect.objectContaining({reversed: true}))
  expect(observer.observe).toHaveBeenCalledWith(surface.querySelector('canvas'))
  expect(surface.querySelector('canvas')).not.toHaveClass('invisible')

  fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(observer.disconnect).toHaveBeenCalledOnce()
})

it('should ignore late depth initialization after closing the selected card', async () => {
  const initialization = Promise.withResolvers<boolean>()
  renderer.initialize.mockReturnValue(initialization.promise)
  render(() => <TarotCardView card={{...TAROT_CARDS[0]!, orientation: 'upright'}} locale="en" />)
  fireEvent.click(screen.getByRole('button', {name: 'The Fool 크게 보기'}))
  await vi.dynamicImportSettled()
  const dialog = screen.getByRole('dialog', {name: 'The Fool'})
  const canvas = within(dialog).getByRole('group', {name: 'The Fool'}).querySelector('canvas')!
  expect(renderer.initialize).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({marker: '0', name: 'The Fool'}),
  )
  expect(canvas).toHaveClass('invisible')
  fireEvent.click(within(dialog).getByRole('button', {name: '닫기'}))
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(observer.disconnect).toHaveBeenCalledOnce()

  initialization.resolve(true)
  await initialization.promise
  await Promise.resolve()

  expect(renderer.render).not.toHaveBeenCalled()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(canvas).toHaveClass('invisible')
  expect(canvas).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
