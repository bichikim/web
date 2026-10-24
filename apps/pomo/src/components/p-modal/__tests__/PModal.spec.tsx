/** @vitest-environment jsdom */

import {Dialog} from '@kobalte/core/dialog'
import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, onCleanup} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {PModal} from '../PModal'
import {PModalTabList} from '../../p-modal-tab-list/PModalTabList'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each([false, true, undefined])(
  'should honor closeOnEscape=%s after switching tabs and preserve the close button',
  async (closeOnEscape) => {
    const onOpenChange = vi.fn()
    render(() => (
      <Tabs defaultValue="general">
        <PModal
          closeOnEscape={closeOnEscape}
          isOpen
          navigation={
            <PModalTabList
              accessibleLabel="Settings tabs"
              items={[
                {icon: 'i-tabler-settings', label: 'General', value: 'general'},
                {icon: 'i-tabler-photo', label: 'Background', value: 'background'},
              ]}
            />
          }
          onOpenChange={onOpenChange}
          title="Settings"
        >
          <Tabs.Content value="general">General content</Tabs.Content>
          <Tabs.Content value="background">Background content</Tabs.Content>
        </PModal>
      </Tabs>
    ))

    const backgroundTab = screen.getByRole('tab', {name: 'Background'})
    fireEvent.click(backgroundTab)
    await waitFor(() => expect(backgroundTab).toHaveAttribute('aria-selected', 'true'))
    backgroundTab.focus()
    fireEvent.keyDown(backgroundTab, {key: 'Escape'})
    if (closeOnEscape === false) {
      expect(onOpenChange).not.toHaveBeenCalled()
    } else {
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    }
    onOpenChange.mockClear()

    const closeButton = screen.getByRole('button', {name: m.common_close()})
    closeButton.focus()
    fireEvent.keyDown(closeButton, {key: 'Escape'})
    if (closeOnEscape === false) {
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog', {name: 'Settings'})).toBeInTheDocument()
    } else {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }

    onOpenChange.mockClear()
    fireEvent.click(closeButton)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  },
)

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

it('should render header actions beside the close control', () => {
  render(() => (
    <PModal
      headerActions={<button type="button">Header action</button>}
      isOpen
      onOpenChange={vi.fn()}
      title="Modal title"
    >
      <p>Modal body</p>
    </PModal>
  ))

  const header = screen.getByRole('heading', {name: 'Modal title'}).closest('header')
  expect(header).not.toBeNull()
  expect(header).toContainElement(screen.getByRole('button', {name: 'Header action'}))
  expect(header).toContainElement(screen.getByRole('button', {name: m.common_close()}))
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
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
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

it('should preserve Escape cancellation from an input', () => {
  const onOpenChange = vi.fn()
  render(() => (
    <PModal isOpen onOpenChange={onOpenChange} title="Editor">
      <input aria-label="Draft" onKeyDown={(event) => event.preventDefault()} />
    </PModal>
  ))
  fireEvent.keyDown(screen.getByRole('textbox', {name: 'Draft'}), {key: 'Escape'})
  expect(onOpenChange).not.toHaveBeenCalled()
})

it('should dismiss only the nested modal when Escape is pressed on its tab', () => {
  const [innerOpen, setInnerOpen] = createSignal(false)
  const outerChange = vi.fn()
  const innerChange = vi.fn()
  render(() => (
    <PModal isOpen onOpenChange={outerChange} title="Outer">
      <Tabs defaultValue="general">
        <PModal
          isOpen={innerOpen()}
          onOpenChange={innerChange}
          title="Inner"
          navigation={
            <PModalTabList
              accessibleLabel="Inner tabs"
              items={[{icon: 'i-tabler-settings', label: 'General', value: 'general'}]}
            />
          }
        >
          <Tabs.Content value="general">General content</Tabs.Content>
        </PModal>
      </Tabs>
    </PModal>
  ))
  setInnerOpen(true)
  fireEvent.keyDown(screen.getByRole('tab', {name: 'General'}), {key: 'Escape'})
  expect(innerChange).toHaveBeenCalledExactlyOnceWith(false)
  expect(outerChange).not.toHaveBeenCalled()
})

it('should focus the requested input after opening a nested modal', async () => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [input, setInput] = createSignal<HTMLTextAreaElement | null>(null)
  render(() => (
    <PModal isOpen onOpenChange={vi.fn()} title="Parent">
      <button onClick={() => setIsOpen(true)} type="button">
        Create memo
      </button>
      <PModal getInitialFocus={input} isOpen={isOpen()} onOpenChange={setIsOpen} title="Memo">
        <textarea aria-label="Memo text" ref={setInput} />
      </PModal>
    </PModal>
  ))
  const trigger = screen.getByRole('button', {name: 'Create memo'})
  await waitFor(() => expect(screen.getByRole('button', {name: m.common_close()})).toHaveFocus())
  trigger.focus()
  fireEvent.click(trigger)
  await waitFor(() => expect(screen.getByRole('textbox', {name: 'Memo text'})).toHaveFocus())
})

it.each(['close', 'unmount'])('should cancel pending initial focus on %s', async (action) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [input, setInput] = createSignal<HTMLTextAreaElement | null>(null)
  const {unmount} = render(() => (
    <PModal getInitialFocus={input} isOpen={isOpen()} onOpenChange={setIsOpen} title="Memo">
      <textarea aria-label="Memo text" ref={setInput} />
    </PModal>
  ))
  setIsOpen(true)
  const focus = vi.spyOn(screen.getByRole('textbox', {name: 'Memo text'}), 'focus')
  if (action === 'close') {
    setIsOpen(false)
  } else {
    unmount()
  }
  await Promise.resolve()
  expect(focus).not.toHaveBeenCalled()
})

interface CountedNavigationProps {
  readonly onCreate: () => void
  readonly onDispose: () => void
}

const CountedNavigation = (props: CountedNavigationProps) => {
  props.onCreate()
  onCleanup(props.onDispose)
  return (
    <PModalTabList
      accessibleLabel="Counted tabs"
      items={[
        {icon: 'i-tabler-settings', label: 'General', value: 'general'},
        {icon: 'i-tabler-photo', label: 'Background', value: 'background'},
      ]}
    />
  )
}

it('should reuse one navigation instance while changing content padding', () => {
  const onCreate = vi.fn()
  const onDispose = vi.fn()
  const [padding, setPadding] = createSignal<'default' | 'none'>('default')
  const result = render(() => (
    <Tabs defaultValue="general">
      <PModal
        contentPadding={padding()}
        isOpen
        navigation={<CountedNavigation onCreate={onCreate} onDispose={onDispose} />}
        onOpenChange={vi.fn()}
        title="Counted modal"
      >
        <button onClick={() => setPadding('none')} type="button">
          Remove padding
        </button>
        <button onClick={() => setPadding('default')} type="button">
          Restore padding
        </button>
      </PModal>
    </Tabs>
  ))

  const list = screen.getByRole('tablist', {name: 'Counted tabs'})
  expect(onCreate).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: 'Remove padding'}))
  fireEvent.click(screen.getByRole('button', {name: 'Restore padding'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBe(list)
  expect(screen.getAllByRole('tab')).toHaveLength(2)
  expect(onCreate).toHaveBeenCalledTimes(1)
  expect(onDispose).not.toHaveBeenCalled()
  result.unmount()
  expect(onDispose).toHaveBeenCalledTimes(1)
})

it('should create navigation only for each visible modal lifetime', async () => {
  // jsdom has no stylesheet animation defaults; represent the browser's no-animation state.
  const readStyles = globalThis.getComputedStyle
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    if (styles.animationName === '') {
      styles.animationName = 'none'
    }
    return styles
  })
  const onCreate = vi.fn()
  const onDispose = vi.fn()
  const [isOpen, setIsOpen] = createSignal(false)
  const result = render(() => (
    <Tabs defaultValue="general">
      <PModal
        isOpen={isOpen()}
        navigation={<CountedNavigation onCreate={onCreate} onDispose={onDispose} />}
        onOpenChange={setIsOpen}
        title="Counted modal"
      >
        Modal content
      </PModal>
      <button onClick={() => setIsOpen(true)} type="button">
        Open counted modal
      </button>
    </Tabs>
  ))

  expect(onCreate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Open counted modal'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBeInTheDocument()
  expect(onCreate).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: m.common_close()}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(onDispose).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: 'Open counted modal'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBeInTheDocument()
  expect(onCreate).toHaveBeenCalledTimes(2)
  result.unmount()
  expect(onDispose).toHaveBeenCalledTimes(2)
})

it('should resolve changing navigation only while the header is visible', () => {
  const onCreate = vi.fn()
  const onDispose = vi.fn()
  const [header, setHeader] = createSignal<'default' | 'hidden'>('hidden')
  const [hasNavigation, setHasNavigation] = createSignal(true)
  const result = render(() => (
    <Tabs defaultValue="general">
      <PModal
        headerMode={header()}
        isOpen
        navigation={
          hasNavigation() ? (
            <CountedNavigation onCreate={onCreate} onDispose={onDispose} />
          ) : undefined
        }
        onOpenChange={vi.fn()}
        title="Counted modal"
      >
        <button onClick={() => setHeader('default')} type="button">
          Show header
        </button>
        <button onClick={() => setHeader('hidden')} type="button">
          Hide header
        </button>
        <button onClick={() => setHasNavigation(false)} type="button">
          Remove navigation
        </button>
        <button onClick={() => setHasNavigation(true)} type="button">
          Restore navigation
        </button>
      </PModal>
    </Tabs>
  ))

  expect(onCreate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: 'Show header'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBeInTheDocument()
  expect(onCreate).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: 'Remove navigation'}))
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  expect(onDispose).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: 'Restore navigation'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBeInTheDocument()
  expect(onCreate).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('button', {name: 'Hide header'}))
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  expect(onDispose).toHaveBeenCalledTimes(2)
  result.unmount()
  expect(onDispose).toHaveBeenCalledTimes(2)
})

it('should resolve navigation within the dialog context', () => {
  const onOpenChange = vi.fn()
  render(() => (
    <PModal
      isOpen
      navigation={
        <Dialog.CloseButton aria-label="Navigation close">Navigation close</Dialog.CloseButton>
      }
      onOpenChange={onOpenChange}
      title="Context modal"
    >
      Modal content
    </PModal>
  ))

  fireEvent.click(screen.getByRole('button', {name: 'Navigation close'}))
  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
})

it('should preserve navigation between visible header modes', () => {
  const onCreate = vi.fn()
  const onDispose = vi.fn()
  const [mode, setMode] = createSignal<'closeOnly' | 'default'>('default')
  const result = render(() => (
    <Tabs defaultValue="general">
      <PModal
        headerMode={mode()}
        isOpen
        navigation={<CountedNavigation onCreate={onCreate} onDispose={onDispose} />}
        onOpenChange={vi.fn()}
        title="Counted modal"
      >
        <button onClick={() => setMode('closeOnly')} type="button">
          Close-only header
        </button>
        <button onClick={() => setMode('default')} type="button">
          Default header
        </button>
      </PModal>
    </Tabs>
  ))

  const list = screen.getByRole('tablist', {name: 'Counted tabs'})
  const tab = screen.getByRole('tab', {name: 'General'})
  tab.focus()
  list.scrollLeft = 17
  fireEvent.click(screen.getByRole('button', {name: 'Close-only header'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBe(list)
  expect(tab).toHaveFocus()
  expect(list.scrollLeft).toBe(17)
  fireEvent.click(screen.getByRole('button', {name: 'Default header'}))
  expect(screen.getByRole('tablist', {name: 'Counted tabs'})).toBe(list)
  expect(tab).toHaveFocus()
  expect(list.scrollLeft).toBe(17)
  expect(onCreate).toHaveBeenCalledTimes(1)
  expect(onDispose).not.toHaveBeenCalled()
  result.unmount()
  expect(onDispose).toHaveBeenCalledTimes(1)
})
