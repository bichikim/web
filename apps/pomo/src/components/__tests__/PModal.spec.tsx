/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {PModal} from '../PModal'
import {PModalTabList} from '../PModalTabList'

afterEach(() => vi.restoreAllMocks())

it('should omit the header while preserving the accessible dialog title', () => {
  render(() => (
    <PModal headerMode="hidden" isOpen onOpenChange={vi.fn()} title="Drawing">
      Canvas
    </PModal>
  ))
  const dialog = screen.getByRole('dialog', {name: 'Drawing'})
  expect(dialog.querySelector('header')).toBeNull()
  expect(screen.getByText('Drawing')).toHaveClass('sr-only')
  expect(screen.queryByRole('button', {name: m.common_close()})).not.toBeInTheDocument()
  expect(screen.getByText('Canvas')).toBeInTheDocument()
})

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
  const navigation = screen.getByText('Settings navigation')
  expect(navigation).toBeInTheDocument()
  expect(navigation.parentElement).not.toHaveClass('pl-1')
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

it('should preserve the tabs context through navigation, portal, and reopening', async () => {
  const readStyles = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
  const [isOpen, setIsOpen] = createSignal(false)
  render(() => (
    <Tabs defaultValue="general">
      <PModal
        isOpen={isOpen()}
        navigation={
          <PModalTabList
            accessibleLabel="Settings tabs"
            items={[
              {icon: 'i-tabler-settings', label: 'General', value: 'general'},
              {icon: 'i-tabler-help', label: 'Guide', value: 'guide'},
            ]}
          />
        }
        onOpenChange={setIsOpen}
        title="Settings"
      >
        <Tabs.Content value="general">General content</Tabs.Content>
        <Tabs.Content value="guide">Guide content</Tabs.Content>
      </PModal>
    </Tabs>
  ))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  setIsOpen(true)
  await screen.findByRole('dialog', {name: 'Settings'})
  expect(screen.getByRole('tabpanel')).toHaveTextContent('General content')
  fireEvent.click(screen.getByRole('tab', {name: 'Guide'}))
  await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('Guide content'))
  expect(screen.getByRole('tab', {name: 'Guide'})).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  setIsOpen(true)
  await screen.findByRole('dialog', {name: 'Settings'})
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Guide content')
  fireEvent.click(screen.getByRole('tab', {name: 'General'}))
  await waitFor(() => expect(screen.getByRole('tabpanel')).toHaveTextContent('General content'))
})
