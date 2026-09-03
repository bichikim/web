/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {PModal} from '../PModal'

it('should render and close the default modal content', async () => {
  const onOpenChange = vi.fn()

  render(() => (
    <PModal
      description="Modal description"
      footer={<div>Modal footer</div>}
      isOpen
      onOpenChange={onOpenChange}
      title="Modal title"
    >
      <p>Modal body</p>
    </PModal>
  ))

  const dialog = screen.getByRole('dialog', {name: 'Modal title'})
  expect(dialog).toHaveAttribute('data-placement', 'center')
  expect(dialog).toHaveAttribute('data-size', 'regular')
  expect(dialog).toHaveClass('bg-modal-surface')
  expect(screen.getByText('Modal description')).toBeInTheDocument()
  expect(screen.getByText('Modal footer')).toBeInTheDocument()
  expect(screen.getByText('Modal body').parentElement).toHaveClass('overflow-y-auto')

  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
})

it('should render visually hidden navigation with compact close controls', () => {
  render(() => (
    <PModal
      contentOverflow="hidden"
      isOpen
      navigation={<nav>Settings navigation</nav>}
      onOpenChange={vi.fn()}
      placement="top"
      size="full"
      title="Settings"
      titleVisibility="visually-hidden"
    >
      <p>Settings content</p>
    </PModal>
  ))

  const dialog = screen.getByRole('dialog', {name: 'Settings'})
  expect(dialog).toHaveAttribute('data-placement', 'top')
  expect(dialog).toHaveAttribute('data-size', 'full')
  expect(screen.getByText('Settings navigation')).toBeInTheDocument()
  expect(screen.getByText('Settings content').parentElement).toHaveClass('overflow-hidden')
  expect(screen.getByRole('button', {name: m.common_close()})).toBeInTheDocument()
})

it('should render close-only and visible-title navigation layouts', () => {
  const {unmount} = render(() => (
    <PModal
      closeButtonVisibility="hidden"
      headerMode="closeOnly"
      isOpen
      navigation={<nav>Close-only navigation</nav>}
      onOpenChange={vi.fn()}
      size="wide"
      title="Close-only modal"
    >
      Content
    </PModal>
  ))

  expect(screen.getByRole('dialog', {name: 'Close-only modal'})).toHaveAttribute(
    'data-size',
    'wide',
  )
  expect(screen.getByText('Close-only navigation')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: m.common_close()})).not.toBeInTheDocument()

  unmount()
  render(() => (
    <PModal
      isOpen
      navigation={<nav>Visible navigation</nav>}
      onOpenChange={vi.fn()}
      title="Navigation modal"
    >
      Content
    </PModal>
  ))

  expect(screen.getByText('Navigation modal')).toBeVisible()
  expect(screen.getByText('Visible navigation')).toBeInTheDocument()
})

it('should apply custom open and close focus behavior', async () => {
  const onCloseAutoFocus = vi.fn()
  let initialFocus: HTMLButtonElement | undefined

  const Harness = () => {
    const [isOpen, setIsOpen] = createSignal(true)
    return (
      <PModal
        getInitialFocus={() => initialFocus ?? null}
        isOpen={isOpen()}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenChange={setIsOpen}
        title="Focus modal"
      >
        <button ref={initialFocus} type="button">
          Initial action
        </button>
      </PModal>
    )
  }

  const {unmount} = render(() => <Harness />)

  await waitFor(() => expect(screen.getByRole('button', {name: 'Initial action'})).toHaveFocus())
  const dialog = screen.getByRole('dialog', {name: 'Focus modal'})
  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  fireEvent.animationEnd(dialog)
  unmount()
  await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledOnce())
})
