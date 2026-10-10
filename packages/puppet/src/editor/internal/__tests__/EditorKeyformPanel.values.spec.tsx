/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorKeyformPanel} from '../EditorKeyformPanel'
import {addParameter} from '../parameter-keyforms'
import {createOneDimensionalDocument, dispatchPointerEvent} from './keyform-panel/fixtures'

describe('EditorKeyformPanel values', () => {
  test('should select an inactive one-dimensional track and apply its clicked value', () => {
    const document = createDemoDocument()
    const added = addParameter({document, nodeIds: ['mesh-preview']})
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={added!.document.parameterBindings ?? []}
        parameters={added!.document.parameters ?? []}
        values={[0, 0]}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
      />
    ))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')

    expect(
      view.getByRole('button', {name: 'Parameter 3'}).closest('.keyform-track-label'),
    ).not.toHaveClass('parameter-grid-label')

    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 176,
      height: 76,
      left: 100,
      right: 300,
      toJSON: () => ({}),
      top: 100,
      width: 200,
      x: 100,
      y: 100,
    })
    fireEvent(
      track,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 150, clientY: 138}),
    )

    expect(onBindingSelect).toHaveBeenCalledWith(added!.binding.id)
    expect(onValueChange).toHaveBeenCalledWith([-15])
  })

  test('should select an inactive two-dimensional track and apply its clicked values', () => {
    const document = createDemoDocument()
    const added = addParameter({document, nodeIds: ['mesh-preview']})
    const onBindingSelect = vi.fn()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={added!.binding.id}
        bindings={added!.document.parameterBindings ?? []}
        parameters={added!.document.parameters ?? []}
        values={[0]}
        onBindingSelect={onBindingSelect}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    fireEvent(
      grid,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 232, clientY: 100}),
    )

    expect(onBindingSelect).toHaveBeenCalledWith('angle-xy')
    expect(onValueChange).toHaveBeenCalledWith([30, 30])
  })

  test('should update both values while dragging the visual grid', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    fireEvent(
      grid,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 166, clientY: 166}),
    )
    fireEvent(globalThis.window, new MouseEvent('pointermove', {clientX: 232, clientY: 100}))
    fireEvent(globalThis.window, new MouseEvent('pointerup'))

    expect(onValueChange).toHaveBeenNthCalledWith(1, [0, 0])
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
  })

  test('should ignore another pointer during a two-dimensional value drag', () => {
    const document = createDemoDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId="angle-xy"
        bindings={document.parameterBindings ?? []}
        parameters={document.parameters ?? []}
        values={[0, 0]}
        onValueChange={onValueChange}
      />
    ))
    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement

    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    dispatchPointerEvent({
      clientX: 166,
      clientY: 166,
      pointerId: 1,
      target: grid,
      type: 'pointerdown',
    })
    dispatchPointerEvent({
      clientX: 232,
      clientY: 100,
      pointerId: 2,
      target: globalThis.window,
      type: 'pointermove',
    })
    dispatchPointerEvent({
      clientX: 232,
      clientY: 100,
      pointerId: 2,
      target: globalThis.window,
      type: 'pointerup',
    })

    expect(onValueChange).toHaveBeenCalledOnce()
    dispatchPointerEvent({
      clientX: 232,
      clientY: 100,
      pointerId: 1,
      target: globalThis.window,
      type: 'pointermove',
    })
    expect(onValueChange).toHaveBeenLastCalledWith([30, 30])
    dispatchPointerEvent({
      clientX: 232,
      clientY: 100,
      pointerId: 1,
      target: globalThis.window,
      type: 'pointerup',
    })
  })

  test('should ignore another pointer during a one-dimensional value drag', () => {
    const fixture = createOneDimensionalDocument()
    const onValueChange = vi.fn()
    const view = render(() => (
      <EditorKeyformPanel
        activeBindingId={fixture.bindingId}
        bindings={fixture.document.parameterBindings ?? []}
        parameters={fixture.document.parameters ?? []}
        values={[0]}
        onValueChange={onValueChange}
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
    const scrubber = view.getByRole('slider', {name: 'Parameter 3 현재 값'})
    dispatchPointerEvent({clientX: 400, pointerId: 1, target: scrubber, type: 'pointerdown'})
    dispatchPointerEvent({
      clientX: 550,
      pointerId: 2,
      target: globalThis.window,
      type: 'pointermove',
    })
    dispatchPointerEvent({clientX: 550, pointerId: 2, target: globalThis.window, type: 'pointerup'})

    expect(onValueChange).toHaveBeenCalledOnce()
    dispatchPointerEvent({
      clientX: 550,
      pointerId: 1,
      target: globalThis.window,
      type: 'pointermove',
    })
    expect(onValueChange).toHaveBeenLastCalledWith([15])
    dispatchPointerEvent({clientX: 550, pointerId: 1, target: globalThis.window, type: 'pointerup'})
  })
})
