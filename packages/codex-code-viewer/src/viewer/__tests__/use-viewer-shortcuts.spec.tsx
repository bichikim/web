/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useViewerShortcuts} from '../use-viewer-shortcuts'

describe('useViewerShortcuts', () => {
  afterEach(cleanup)

  it('should open file-local search with either platform shortcut without opening the file picker', () => {
    const onFind = vi.fn()
    const onSearch = vi.fn()
    render(() => {
      useViewerShortcuts({onDismiss: vi.fn(), onFind, onMove: vi.fn(), onSearch})
      return <div />
    })
    expect(fireEvent.keyDown(document.body, {ctrlKey: true, key: 'f'})).toBe(false)
    expect(fireEvent.keyDown(document.body, {key: 'F', metaKey: true})).toBe(false)
    expect(onFind).toHaveBeenCalledTimes(2)
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('should handle search from body focus and remove the listener when unmounted', () => {
    const onSearch = vi.fn()
    const view = render(() => {
      useViewerShortcuts({onDismiss: vi.fn(), onMove: vi.fn(), onSearch})
      return <div />
    })
    fireEvent.keyDown(document.body, {key: 'p', metaKey: true})
    expect(onSearch).toHaveBeenCalledOnce()
    view.unmount()
    fireEvent.keyDown(document.body, {key: 'p', metaKey: true})
    expect(onSearch).toHaveBeenCalledOnce()
  })

  it('should keep history and dismissal shortcuts while ignoring IME composition', () => {
    const onDismiss = vi.fn()
    const onMove = vi.fn()
    const onSearch = vi.fn()
    render(() => {
      useViewerShortcuts({onDismiss, onMove, onSearch})
      return <div />
    })
    fireEvent.keyDown(document.body, {altKey: true, key: 'ArrowLeft'})
    fireEvent.keyDown(document.body, {altKey: true, key: 'ArrowRight'})
    fireEvent.keyDown(document.body, {key: 'Escape'})
    fireEvent.keyDown(document.body, {ctrlKey: true, isComposing: true, key: 'p'})
    expect(onMove.mock.calls).toEqual([[-1], [1]])
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onSearch).not.toHaveBeenCalled()
  })
})
