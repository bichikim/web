/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformPanel} from '../EditorKeyformPanel'
import {createOneDimensionalDocument, dispatchPointerEvent} from './keyform-panel/fixtures'

describe('EditorKeyformPanel keyforms', () => {
  test.each(['add', 'delete'] as const)(
    'should not open an empty menu when only %s is supported',
    (operation) => {
      const {document} = createOneDimensionalDocument()
      const onValueChange = vi.fn()
      const view = render(() => (
        <EditorKeyformPanel
          bindings={document.parameterBindings ?? []}
          parameters={document.parameters ?? []}
          onValueChange={onValueChange}
          onKeyformAdd={operation === 'add' ? vi.fn() : undefined}
          onKeyformDelete={operation === 'delete' ? vi.fn() : undefined}
        />
      ))
      const track = view.getByLabelText('Parameter 3 키폼 트랙')
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 76))

      fireEvent.contextMenu(
        operation === 'add' ? view.getByRole('button', {name: 'Parameter 3 30 키폼'}) : track,
        {clientX: 150},
      )

      expect(onValueChange).toHaveBeenLastCalledWith(operation === 'add' ? [30] : [-15])
      expect(screen.queryByRole('menu', {name: '키폼 작업'})).not.toBeInTheDocument()

      fireEvent.contextMenu(
        operation === 'add' ? track : view.getByRole('button', {name: 'Parameter 3 30 키폼'}),
        {clientX: 150},
      )

      expect(
        screen.getByRole('menuitem', {name: operation === 'add' ? '키폼 추가' : '키폼 삭제'}),
      ).toBeVisible()
    },
  )

  test('should create a keyform at the context-menu position without toolbar actions', async () => {
    const document = createDemoDocument()
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const onKeyformAdd = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
        onKeyformAdd={onKeyformAdd}
      />
    ))
    const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
    // The grid has no separate accessible control; the named track owns its hit surface.
    const grid = track.querySelector('.parameter-grid')!
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200))
    fireEvent.contextMenu(grid, {clientX: 150, clientY: 150})
    expect(await screen.findByRole('menu', {name: '키폼 작업'})).toBeVisible()
    const add = screen.getByRole('menuitem', {name: '키폼 추가'})
    expect(add).not.toHaveAttribute('data-disabled')
    expect(screen.queryByRole('menuitem', {name: '키폼 삭제'})).not.toBeInTheDocument()
    fireEvent.keyDown(add, {key: 'Enter'})
    expect(onBindingSelect).toHaveBeenLastCalledWith('angle-xy')
    expect(onValueChange).toHaveBeenLastCalledWith([-15, 15])
    expect(onKeyformAdd).toHaveBeenCalledOnce()
    expect(view.queryByRole('button', {name: '현재 값에 키폼'})).not.toBeInTheDocument()
    expect(view.queryByRole('button', {name: '선택 키폼 삭제'})).not.toBeInTheDocument()
  })

  test('should delete the right-clicked keyform from an inactive track', async () => {
    const {document, bindingId} = createOneDimensionalDocument()
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const onKeyformDelete = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        activeKeyformValues={[0, 0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
        onKeyformDelete={onKeyformDelete}
      />
    ))
    fireEvent.contextMenu(view.getByRole('button', {name: 'Parameter 3 30 키폼'}))
    await screen.findByRole('menu', {name: '키폼 작업'})
    expect(screen.queryByRole('menuitem', {name: '키폼 추가'})).not.toBeInTheDocument()
    const remove = screen.getByRole('menuitem', {name: '키폼 삭제'})
    expect(remove).not.toHaveAttribute('data-disabled')
    fireEvent.keyDown(remove, {key: 'Enter'})
    expect(onBindingSelect).toHaveBeenLastCalledWith(bindingId)
    expect(onValueChange).toHaveBeenLastCalledWith([30])
    expect(onKeyformDelete).toHaveBeenCalledOnce()
  })

  test('should preview a keyform drag and commit its value only after release', () => {
    const onKeyformMove = vi.fn()
    const onKeyformSelect = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
        onKeyformSelect={onKeyformSelect}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})

    marker.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 400}))
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 550}))
    expect(view.getByRole('button', {name: 'Parameter 3 15 키폼'})).toHaveClass('dragging')
    expect(onKeyformMove).not.toHaveBeenCalled()
    globalThis.dispatchEvent(new MouseEvent('pointerup'))

    expect(onKeyformSelect).toHaveBeenCalledWith(fixture.bindingId, [0])
    expect(onKeyformMove).toHaveBeenCalledOnce()
    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [15])
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 650}))
    expect(onKeyformMove).toHaveBeenCalledOnce()

    const cancelMarker = view.getByRole('button', {name: 'Parameter 3 -30 키폼'})
    cancelMarker.dispatchEvent(
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}),
    )
    globalThis.dispatchEvent(new MouseEvent('pointermove', {clientX: 250}))
    expect(view.getByRole('button', {name: 'Parameter 3 -15 키폼'})).toHaveClass('dragging')
    globalThis.dispatchEvent(new MouseEvent('pointercancel'))
    expect(view.getByRole('button', {name: 'Parameter 3 -30 키폼'})).not.toHaveClass('dragging')
    expect(onKeyformMove).toHaveBeenCalledOnce()
  })

  test('should move a focused keyform with the keyboard', () => {
    const onKeyformMove = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
      />
    ))

    fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 3 0 키폼'}), {
      key: 'ArrowRight',
    })

    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [0.5])
  })

  test('should ignore pointer events from another pointer during a keyform drag', () => {
    const onKeyformMove = vi.fn()
    const fixture = createOneDimensionalDocument()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onKeyformMove={onKeyformMove}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})
    dispatchPointerEvent({clientX: 400, pointerId: 1, target: marker, type: 'pointerdown'})
    dispatchPointerEvent({
      clientX: 550,
      pointerId: 2,
      target: globalThis.window,
      type: 'pointermove',
    })
    dispatchPointerEvent({clientX: 550, pointerId: 2, target: globalThis.window, type: 'pointerup'})

    expect(onKeyformMove).not.toHaveBeenCalled()
    expect(marker).not.toHaveClass('dragging')

    dispatchPointerEvent({
      clientX: 550,
      pointerId: 1,
      target: globalThis.window,
      type: 'pointermove',
    })
    expect(view.getByRole('button', {name: 'Parameter 3 15 키폼'})).toHaveClass('dragging')
    dispatchPointerEvent({clientX: 550, pointerId: 1, target: globalThis.window, type: 'pointerup'})
    expect(onKeyformMove).toHaveBeenCalledWith(fixture.bindingId, [0], [15])
  })

  test('should add a keyform at the double-clicked one-dimensional value', () => {
    const {document, bindingId} = createOneDimensionalDocument()
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const onKeyformAdd = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
        onKeyformAdd={onKeyformAdd}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 40))
    fireEvent.dblClick(track, {clientX: 150})
    expect(onBindingSelect).toHaveBeenCalledWith(bindingId)
    expect(onValueChange).toHaveBeenCalledWith([-15])
    expect(onKeyformAdd).toHaveBeenCalledTimes(1)
    expect(track).toHaveFocus()
  })

  test('should add a keyform at the double-clicked two-dimensional values', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const onKeyformAdd = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onValueChange={onValueChange}
        onKeyformAdd={onKeyformAdd}
      />
    ))
    const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
    const grid = track.querySelector('.parameter-grid')!
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200))
    fireEvent.dblClick(grid, {clientX: 150, clientY: 150})
    expect(onValueChange).toHaveBeenCalledWith([-15, 15])
    expect(onKeyformAdd).toHaveBeenCalledTimes(1)
  })

  test('should delete the selected keyform with Backspace without deleting while typing', () => {
    const {document, bindingId} = createOneDimensionalDocument()
    const onKeyformDelete = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={bindingId}
        activeKeyformValues={[0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onKeyformDelete={onKeyformDelete}
      />
    ))
    fireEvent.keyDown(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {key: 'Backspace'})
    expect(onKeyformDelete).not.toHaveBeenCalled()
    fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 3 0 키폼'}), {key: 'Backspace'})
    expect(onKeyformDelete).toHaveBeenCalledTimes(1)
  })

  test('should keep preview bindings unchanged for double-click and Backspace', () => {
    const document = createDemoDocument()
    const onKeyformAdd = vi.fn()
    const onKeyformDelete = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        activeKeyformValues={[0, 0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        previewBindingIds={new Set(['angle-xy'])}
        onKeyformAdd={onKeyformAdd}
        onKeyformDelete={onKeyformDelete}
      />
    ))
    const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
    fireEvent.dblClick(track.querySelector('.parameter-grid')!, {clientX: 150, clientY: 150})
    fireEvent.keyDown(track, {key: 'Backspace'})
    expect(onKeyformAdd).not.toHaveBeenCalled()
    expect(onKeyformDelete).not.toHaveBeenCalled()
  })

  test('should not add a second keyform when double-clicking an occupied value', () => {
    const {document} = createOneDimensionalDocument()
    const onKeyformAdd = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onKeyformAdd={onKeyformAdd}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 40))
    fireEvent.dblClick(track, {clientX: 200})
    fireEvent.dblClick(view.getByRole('button', {name: 'Parameter 3 0 키폼'}))
    expect(onKeyformAdd).not.toHaveBeenCalled()
  })

  test('should ignore repeated or composing deletion keyboard events', () => {
    const {document, bindingId} = createOneDimensionalDocument()
    const onKeyformDelete = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={bindingId}
        activeKeyformValues={[0]}
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        onKeyformDelete={onKeyformDelete}
      />
    ))
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})
    fireEvent.keyDown(marker, {key: 'Backspace', repeat: true})
    fireEvent.keyDown(marker, {isComposing: true, key: 'Backspace'})
    expect(onKeyformDelete).not.toHaveBeenCalled()
  })
})
