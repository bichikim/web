/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {beforeEach, expect, test, vi} from 'vitest'

import {EditorPanelLayout} from '../EditorPanelLayout'

beforeEach(() => localStorage.clear())

test('should activate its editor from pointer and keyboard focus', () => {
  const onActivate = vi.fn()
  const view = render(() => (
    <EditorPanelLayout onActivate={onActivate} viewport={<button>편집 도구</button>} />
  ))

  fireEvent.pointerDown(view.getByRole('button', {name: '편집 도구'}))
  fireEvent.focusIn(view.getByRole('button', {name: '편집 도구'}))

  expect(onActivate).toHaveBeenCalledTimes(2)
})

test('should resize panels with separators and clamp keyboard resizing at the minimum size', () => {
  const view = render(() => (
    <EditorPanelLayout
      bottom={<section>Bottom</section>}
      inspector={<aside>Right</aside>}
      layers={<aside>Left</aside>}
      toolbar={(visibility) => (
        <header>
          <button type="button" onClick={visibility.onLeftToggle}>
            {visibility.leftOpen ? '왼쪽 닫기' : '왼쪽 열기'}
          </button>
        </header>
      )}
      viewport={<section>Viewport</section>}
    />
  ))
  const editor = view.container.querySelector('.puppet-editor')
  const leftResizer = view.getByRole('separator', {name: '왼쪽 패널 너비 조절'})

  expect(leftResizer).toHaveAttribute('aria-valuenow', '300')
  fireEvent.keyDown(leftResizer, {key: 'ArrowLeft'})
  expect(leftResizer).toHaveAttribute('aria-valuenow', '284')

  for (let index = 0; index < 5; index += 1) {
    fireEvent.keyDown(leftResizer, {key: 'ArrowLeft'})
  }

  expect(editor).not.toHaveClass('left-panel-closed')
  expect(leftResizer).toHaveAttribute('aria-valuenow', '220')

  fireEvent.click(view.getByRole('button', {name: '왼쪽 닫기'}))
  expect(editor).toHaveClass('left-panel-closed')
  fireEvent.click(view.getByRole('button', {name: '왼쪽 열기'}))
  expect(editor).not.toHaveClass('left-panel-closed')
})

test('should hold the minimum size while dragging and collapse only after release', () => {
  const view = render(() => <EditorPanelLayout />)
  const editor = view.container.querySelector('.puppet-editor')
  const rightResizer = view.getByRole('separator', {name: '오른쪽 패널 너비 조절'})
  const bottomResizer = view.getByRole('separator', {name: '아래 프레임 높이 조절'})

  rightResizer.dispatchEvent(
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 300}),
  )
  window.dispatchEvent(new MouseEvent('pointermove', {clientX: 400}))
  expect(editor).not.toHaveClass('right-panel-closed')
  expect(rightResizer).toHaveAttribute('aria-valuenow', '220')
  window.dispatchEvent(new MouseEvent('pointerup'))
  expect(editor).toHaveClass('right-panel-closed')

  bottomResizer.dispatchEvent(
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientY: 300}),
  )
  window.dispatchEvent(new MouseEvent('pointermove', {clientY: 400}))
  expect(editor).not.toHaveClass('bottom-panel-closed')
  expect(bottomResizer).toHaveAttribute('aria-valuenow', '180')
  window.dispatchEvent(new MouseEvent('pointerup'))
  expect(editor).toHaveClass('bottom-panel-closed')
})

test('should remain open when dragged back above the minimum before release', () => {
  const view = render(() => <EditorPanelLayout />)
  const editor = view.container.querySelector('.puppet-editor')
  const leftResizer = view.getByRole('separator', {name: '왼쪽 패널 너비 조절'})

  leftResizer.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 300}))
  expect(leftResizer).toHaveClass('dragging')
  window.dispatchEvent(new MouseEvent('pointermove', {clientX: 180}))
  expect(leftResizer).toHaveAttribute('aria-valuenow', '220')
  expect(leftResizer).toHaveClass('dragging')
  window.dispatchEvent(new MouseEvent('pointermove', {clientX: 240}))
  expect(leftResizer).toHaveAttribute('aria-valuenow', '240')
  window.dispatchEvent(new MouseEvent('pointerup'))

  expect(editor).not.toHaveClass('left-panel-closed')
  expect(leftResizer).toHaveAttribute('aria-valuenow', '240')
  expect(leftResizer).not.toHaveClass('dragging')
})

test('should clear the active resizer effect when pointer dragging is cancelled', () => {
  const view = render(() => <EditorPanelLayout />)
  const bottomResizer = view.getByRole('separator', {name: '아래 프레임 높이 조절'})

  bottomResizer.dispatchEvent(
    new MouseEvent('pointerdown', {bubbles: true, button: 0, clientY: 300}),
  )
  expect(bottomResizer).toHaveClass('dragging')
  window.dispatchEvent(new MouseEvent('pointercancel'))
  expect(bottomResizer).not.toHaveClass('dragging')
})

test('should restore resized and closed panels after remounting', () => {
  const renderLayout = () =>
    render(() => (
      <EditorPanelLayout
        toolbar={(visibility) => (
          <header>
            <button type="button" onClick={visibility.onLeftToggle}>
              왼쪽 전환
            </button>
            <button type="button" onClick={visibility.onRightToggle}>
              오른쪽 전환
            </button>
            <button type="button" onClick={visibility.onBottomToggle}>
              아래 전환
            </button>
          </header>
        )}
      />
    ))
  const firstView = renderLayout()

  fireEvent.keyDown(firstView.getByRole('separator', {name: '왼쪽 패널 너비 조절'}), {
    key: 'ArrowLeft',
  })
  fireEvent.keyDown(firstView.getByRole('separator', {name: '오른쪽 패널 너비 조절'}), {
    key: 'ArrowRight',
  })
  fireEvent.keyDown(firstView.getByRole('separator', {name: '아래 프레임 높이 조절'}), {
    key: 'ArrowUp',
  })
  fireEvent.click(firstView.getByRole('button', {name: '왼쪽 전환'}))
  fireEvent.click(firstView.getByRole('button', {name: '오른쪽 전환'}))
  fireEvent.click(firstView.getByRole('button', {name: '아래 전환'}))
  firstView.unmount()

  const restoredView = renderLayout()
  const editor = restoredView.container.querySelector('.puppet-editor')

  expect(editor).toHaveClass('left-panel-closed', 'right-panel-closed', 'bottom-panel-closed')
  expect(restoredView.getByRole('separator', {name: '왼쪽 패널 너비 조절'})).toHaveAttribute(
    'aria-valuenow',
    '284',
  )
  expect(restoredView.getByRole('separator', {name: '오른쪽 패널 너비 조절'})).toHaveAttribute(
    'aria-valuenow',
    '244',
  )
  expect(restoredView.getByRole('separator', {name: '아래 프레임 높이 조절'})).toHaveAttribute(
    'aria-valuenow',
    '276',
  )
})

test('should clamp valid persisted sizes and replace malformed preferences with defaults', () => {
  const initialView = render(() => <EditorPanelLayout />)
  const storageKey = localStorage.key(0)

  if (storageKey === null) {
    throw new Error('Panel preference was not saved.')
  }

  initialView.unmount()
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      bottom: {open: false, size: 900},
      left: {open: true, size: 100},
      right: {open: false, size: 300},
    }),
  )

  const clampedView = render(() => <EditorPanelLayout />)

  expect(clampedView.getByRole('separator', {name: '왼쪽 패널 너비 조절'})).toHaveAttribute(
    'aria-valuenow',
    '220',
  )
  expect(clampedView.getByRole('separator', {name: '오른쪽 패널 너비 조절'})).toHaveAttribute(
    'aria-valuenow',
    '300',
  )
  expect(clampedView.getByRole('separator', {name: '아래 프레임 높이 조절'})).toHaveAttribute(
    'aria-valuenow',
    '420',
  )
  expect(clampedView.container.querySelector('.puppet-editor')).toHaveClass(
    'right-panel-closed',
    'bottom-panel-closed',
  )
  clampedView.unmount()
  localStorage.setItem(storageKey, '{malformed')

  const fallbackView = render(() => <EditorPanelLayout />)

  expect(fallbackView.getByRole('separator', {name: '왼쪽 패널 너비 조절'})).toHaveAttribute(
    'aria-valuenow',
    '300',
  )
  expect(fallbackView.container.querySelector('.puppet-editor')).not.toHaveClass(
    'left-panel-closed',
    'right-panel-closed',
    'bottom-panel-closed',
  )
})
